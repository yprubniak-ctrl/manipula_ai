/**
 * Stage executor with retry logic, ownership validation, and snapshot triggering.
 */

import {
  OrchestratorProjectState,
  StageSpec,
  AgentResponse,
  FailureClass,
  FAILURE_POLICY,
} from '@manipula/shared';
import { IBudgetController, IModelRouter } from '../agents/interfaces';
import { AgentRegistry } from '../agents/registry';
import { PatchValidator } from '../validation/patch-validator';
import { SchemaValidator } from '../validation/schema-validator';
import { SnapshotManager } from '../snapshot/manager';
import { StateMachine } from './state-machine';
import { Logger } from '../observability/logger';
import {
  stageDurationSeconds,
  tokensTotal,
  stagesTotal,
} from '../observability/metrics';

export interface StageExecutorConfig {
  maxRetries?: number;
  stageTimeoutMs?: number;
  backoffMs?: number[];
}

const DEFAULT_BACKOFF_MS = [2000, 8000, 30000];

/**
 * Executes a single pipeline stage with retry logic, ownership validation,
 * patch application, and snapshot triggering.
 */
export class StageExecutor {
  private readonly patchValidator  = new PatchValidator();
  private readonly schemaValidator = new SchemaValidator();
  private readonly stateMachine    = new StateMachine();

  constructor(
    private readonly registry: AgentRegistry,
    private readonly snapshotManager: SnapshotManager | null,
    private readonly logger: Logger
  ) {}

  async execute(
    state: OrchestratorProjectState,
    spec: StageSpec,
    router: IModelRouter,
    budget: IBudgetController,
    config: StageExecutorConfig = {}
  ): Promise<OrchestratorProjectState> {
    const maxRetries  = config.maxRetries    ?? FAILURE_POLICY[FailureClass.TRANSIENT].max_retries;
    const backoff     = config.backoffMs     ?? DEFAULT_BACKOFF_MS;
    const timeoutMs   = config.stageTimeoutMs ?? 300_000;
    const stageLogger = this.logger.child({ stage: spec.name });

    const agent = this.registry.resolve(spec.agentName, router, budget);

    let current = this.stateMachine.transition(state, spec.name);
    current.status.stage_status = 'running';

    const startMs = Date.now();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      stageLogger.info(`Executing stage attempt ${attempt + 1}/${maxRetries}`);

      let response: AgentResponse;

      try {
        response = await Promise.race([
          agent.execute(current),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Stage execution timed out')), timeoutMs)
          ),
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        stageLogger.error(`Stage execution error: ${message}`);
        response = {
          status: 'error',
          patch: {},
          cost_estimate: { input_tokens: 0, output_tokens: 0, model: 'unknown', cost_usd: 0 },
          warnings: [],
          logs: [{ level: 'error', message }],
        };
      }

      const durationSec = (Date.now() - startMs) / 1000;

      if (response.status === 'ok') {
        this.patchValidator.validateOwnership(response.patch, spec.name);

        const validation = this.schemaValidator.validate(spec.name, response.patch);
        if (!validation.valid) {
          stageLogger.warn(`Schema validation failed: ${validation.errors.join('; ')}`);
          if (attempt < maxRetries - 1) {
            await this.sleep(backoff[attempt] ?? 1000);
            continue;
          }
          current = this.stateMachine.transition(current, 'FAILED');
          current.status.stage_status = 'failed';
          current.status.error = `Schema validation failed: ${validation.errors.join('; ')}`;
          stagesTotal.inc({ stage: spec.name, status: 'failed' });
          return current;
        }

        current = this.applyPatch(current, response.patch);

        tokensTotal.inc({ model: response.cost_estimate.model, stage: spec.name, direction: 'input'  }, response.cost_estimate.input_tokens);
        tokensTotal.inc({ model: response.cost_estimate.model, stage: spec.name, direction: 'output' }, response.cost_estimate.output_tokens);

        if (!current.status.completed_stages.includes(spec.name)) {
          current.status.completed_stages.push(spec.name);
        }
        current.status.stage_status = 'success';

        if (response.warnings.length > 0) {
          current.logs.push({ stage: spec.name, timestamp: new Date().toISOString(), warnings: response.warnings });
        }

        if (this.snapshotManager) {
          try {
            await this.snapshotManager.snapshot(current);
          } catch (snapErr) {
            stageLogger.warn(`Snapshot failed (non-blocking): ${snapErr}`);
          }
        }

        stageDurationSeconds.observe({ stage: spec.name, agent: spec.agentName, status: 'success' }, durationSec);
        stagesTotal.inc({ stage: spec.name, status: 'success' });
        stageLogger.info(`Stage ${spec.name} completed successfully`);
        return current;

      } else if (response.status === 'needs_info') {
        current = this.stateMachine.transition(current, 'PENDING_REVIEW');
        current.status.stage_status = 'skipped';
        stageDurationSeconds.observe({ stage: spec.name, agent: spec.agentName, status: 'needs_info' }, durationSec);
        stagesTotal.inc({ stage: spec.name, status: 'needs_info' });
        return current;

      } else {
        if (attempt < maxRetries - 1) {
          const sleepMs = backoff[attempt] ?? 1000;
          stageLogger.warn(`Stage failed, retrying in ${sleepMs}ms...`);
          await this.sleep(sleepMs);
        }
      }
    }

    const durationSec = (Date.now() - startMs) / 1000;
    current = this.stateMachine.transition(current, 'FAILED');
    current.status.stage_status = 'failed';
    current.status.error = `Stage ${spec.name} failed after ${maxRetries} attempts`;
    stageDurationSeconds.observe({ stage: spec.name, agent: spec.agentName, status: 'failed' }, durationSec);
    stagesTotal.inc({ stage: spec.name, status: 'failed' });
    stageLogger.error(`Stage ${spec.name} failed after all retries`);
    return current;
  }

  private applyPatch(
    state: OrchestratorProjectState,
    patch: Record<string, unknown>
  ): OrchestratorProjectState {
    const next: OrchestratorProjectState = JSON.parse(JSON.stringify(state));
    const nextAsAny = next as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const existing = nextAsAny[key];
        if (existing !== null && typeof existing === 'object' && !Array.isArray(existing)) {
          nextAsAny[key] = {
            ...(existing as Record<string, unknown>),
            ...(value  as Record<string, unknown>),
          };
          continue;
        }
      }
      nextAsAny[key] = value;
    }
    next.meta.version += 1;
    next.meta.updated_at = new Date().toISOString();
    next.history.push({ version: next.meta.version, patch, timestamp: new Date().toISOString() });
    return next;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
