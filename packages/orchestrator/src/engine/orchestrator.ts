/**
 * Main orchestration engine — drives the full project pipeline from IDLE to COMPLETE.
 */

import {
  OrchestratorProjectState,
  OrchestratorStage,
  PIPELINE,
  StageSpec,
  BudgetState,
  OptimisticLockError,
} from '@manipula/shared';
import { IModelRouter } from '../agents/interfaces';
import { AgentRegistry } from '../agents/registry';
import { BudgetController } from '../budget/controller';
import { StageExecutor } from './stage-executor';
import { QAFeedbackLoop } from '../qa/feedback-loop';
import { SnapshotManager } from '../snapshot/manager';
import { Logger } from '../observability/logger';
import { budgetUtilizationRatio } from '../observability/metrics';

// ============================================================================
// Interfaces
// ============================================================================

export interface StateStore {
  load(projectId: string): Promise<OrchestratorProjectState>;
  save(state: OrchestratorProjectState, expectedVersion: number): Promise<void>;
}

export interface DistributedLock {
  acquire(projectId: string): Promise<boolean>;
  release(projectId: string): Promise<void>;
}

export class NoOpLock implements DistributedLock {
  async acquire(_projectId: string): Promise<boolean> { return true; }
  async release(_projectId: string): Promise<void>    { /* no-op */  }
}

// ============================================================================
// Orchestrator
// ============================================================================

export interface OrchestratorOptions {
  registry:         AgentRegistry;
  router:           IModelRouter;
  stateStore:       StateStore;
  snapshotManager?: SnapshotManager;
  lock?:            DistributedLock;
  logger?:          Logger;
  stageTimeoutMs?:  number;
  maxRetries?:      number;
}

/**
 * Production-ready orchestration engine.
 */
export class Orchestrator {
  private readonly registry:        AgentRegistry;
  private readonly router:          IModelRouter;
  private readonly stateStore:      StateStore;
  private readonly snapshotManager: SnapshotManager | null;
  private readonly lock:            DistributedLock;
  private readonly logger:          Logger;
  private readonly stageTimeoutMs:  number;
  private readonly maxRetries:      number;

  constructor(opts: OrchestratorOptions) {
    this.registry        = opts.registry;
    this.router          = opts.router;
    this.stateStore      = opts.stateStore;
    this.snapshotManager = opts.snapshotManager ?? null;
    this.lock            = opts.lock            ?? new NoOpLock();
    this.logger          = opts.logger          ?? new Logger({ component: 'orchestrator' });
    this.stageTimeoutMs  = opts.stageTimeoutMs  ?? 300_000;
    this.maxRetries      = opts.maxRetries      ?? 3;
  }

  async executeProject(projectId: string): Promise<OrchestratorProjectState> {
    const acquired = await this.lock.acquire(projectId);
    if (!acquired) {
      throw new OptimisticLockError(`Could not acquire lock for project ${projectId}`);
    }

    const projectLogger = this.logger.child({ projectId });
    projectLogger.info('Starting project execution');

    try {
      let state  = await this.stateStore.load(projectId);
      const budget = new BudgetController(state, undefined, this.router);

      const executor = new StageExecutor(this.registry, this.snapshotManager, projectLogger);
      const qaLoop   = new QAFeedbackLoop(this.registry, this.snapshotManager, projectLogger);

      for (const spec of PIPELINE) {
        if (state.status.completed_stages.includes(spec.name)) {
          projectLogger.debug(`Skipping completed stage: ${spec.name}`);
          continue;
        }

        const missingPrereqs = this.getMissingPrerequisites(state, spec);
        if (missingPrereqs.length > 0) {
          projectLogger.warn(`Prerequisites missing for ${spec.name}: ${missingPrereqs.join(', ')}`);
          state.status.stage = 'FAILED';
          state.status.error = `Missing prerequisites: ${missingPrereqs.join(', ')}`;
          await this.persistState(state, projectLogger);
          return state;
        }

        try {
          await budget.pipelineGate(spec.name);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          projectLogger.warn(`Budget gate blocked stage ${spec.name}: ${message}`);
          state.status.stage = 'FAILED';
          state.status.error = message;
          await this.persistState(state, projectLogger);
          return state;
        }

        if (spec.approvalCheckpoint) {
          const approvalRequired = state.inputs.approval_required_stages.includes(spec.name);
          if (approvalRequired && !state.status.awaiting_approval) {
            state.status.awaiting_approval = true;
            state.status.stage = 'PENDING_REVIEW';
            await this.persistState(state, projectLogger);
            projectLogger.info(`Paused for approval at stage: ${spec.name}`);
            return state;
          }
          state.status.awaiting_approval = false;
        }

        if (spec.name === 'QA_VALIDATION') {
          state = await qaLoop.run(state, this.router, budget);
        } else {
          state = await executor.execute(state, spec, this.router, budget, {
            maxRetries:    this.maxRetries,
            stageTimeoutMs: this.stageTimeoutMs,
          });
        }

        budgetUtilizationRatio.set({ project_id: projectId }, budget.getUtilizationRatio());
        await this.persistState(state, projectLogger);

        const terminalStages: OrchestratorStage[] = ['FAILED', 'PAUSED', 'PENDING_REVIEW'];
        if (terminalStages.includes(state.status.stage)) {
          projectLogger.info(`Pipeline halted at terminal stage: ${state.status.stage}`);
          return state;
        }
      }

      state.status.stage       = 'COMPLETE';
      state.status.stage_status = 'success';
      state.meta.version       += 1;
      state.meta.updated_at    = new Date().toISOString();
      await this.persistState(state, projectLogger);
      projectLogger.info('Project execution completed successfully');
      return state;
    } finally {
      await this.lock.release(projectId);
    }
  }

  private getMissingPrerequisites(
    state: OrchestratorProjectState,
    spec: StageSpec
  ): string[] {
    return spec.prerequisites.filter((prereq) => {
      const parts = prereq.split('.');
      let obj: unknown = state;
      for (const part of parts) {
        if (obj === null || obj === undefined || typeof obj !== 'object') return true;
        obj = (obj as Record<string, unknown>)[part];
      }
      return obj === null || obj === undefined;
    });
  }

  private async persistState(state: OrchestratorProjectState, log: Logger): Promise<void> {
    try {
      await this.stateStore.save(state, state.meta.version - 1);
    } catch (err) {
      if (err instanceof OptimisticLockError) {
        log.warn('Optimistic lock conflict during save — reload and retry');
        throw err;
      }
      log.error(`State persistence failed: ${err}`);
      throw err;
    }
  }

  static buildDefaultBudget(limitUsd: number): BudgetState {
    return {
      limit_usd:           limitUsd,
      spent_usd:           0,
      token_counts:        { input_tokens: 0, output_tokens: 0 },
      stage_costs:         {},
      iteration_counts:    {},
      frozen:              false,
      downgrade_triggered: false,
      hard_stop_triggered: false,
    };
  }
}
