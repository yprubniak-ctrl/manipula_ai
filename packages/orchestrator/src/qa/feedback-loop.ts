/**
 * QA feedback loop — manages iterative QA validation with targeted re-generation.
 */

import { OrchestratorProjectState } from '@manipula/shared';
import { IBudgetController, IModelRouter } from '../agents/interfaces';
import { AgentRegistry } from '../agents/registry';
import { StageExecutor } from '../engine/stage-executor';
import { SnapshotManager } from '../snapshot/manager';
import { IssueRouter, QAIssue } from './issue-router';
import { Logger } from '../observability/logger';
import { findStageSpec } from '../engine/pipeline';
import { qaIterationsCount, stagesTotal } from '../observability/metrics';

const MAX_QA_ITERATIONS = 3;

/**
 * Runs up to MAX_QA_ITERATIONS of QA validation, re-running affected agents
 * when issues are found.
 */
export class QAFeedbackLoop {
  private readonly issueRouter = new IssueRouter();

  constructor(
    private readonly registry: AgentRegistry,
    private readonly snapshotManager: SnapshotManager | null,
    private readonly logger: Logger
  ) {}

  async run(
    initialState: OrchestratorProjectState,
    router: IModelRouter,
    budget: IBudgetController
  ): Promise<OrchestratorProjectState> {
    const executor     = new StageExecutor(this.registry, this.snapshotManager, this.logger);
    const qaSpec       = findStageSpec('QA_VALIDATION');
    const backendSpec  = findStageSpec('BACKEND_GEN');
    const frontendSpec = findStageSpec('FRONTEND_GEN');

    if (!qaSpec) throw new Error('QA_VALIDATION stage not found in PIPELINE');

    let state = initialState;

    for (let iteration = 1; iteration <= MAX_QA_ITERATIONS; iteration++) {
      state.status.iteration = iteration;
      this.logger.info(`Starting QA iteration ${iteration}/${MAX_QA_ITERATIONS}`);

      const qaIdx = state.status.completed_stages.indexOf('QA_VALIDATION');
      if (qaIdx !== -1) state.status.completed_stages.splice(qaIdx, 1);

      state = await executor.execute(state, qaSpec, router, budget);

      if (state.status.stage === 'FAILED' || state.status.stage === 'PENDING_REVIEW') {
        return state;
      }

      const qaResult = state.qa as Record<string, unknown> | null;
      const passed   = qaResult?.['passed'] === true;

      if (passed) {
        qaIterationsCount.observe({}, iteration);
        stagesTotal.inc({ stage: 'QA_VALIDATION', status: 'passed' });
        return state;
      }

      const issues         = (qaResult?.['issues'] as QAIssue[]) ?? [];
      const criticalIssues = this.issueRouter.getCriticalIssues(issues);
      const backendIssues  = this.issueRouter.getBackendIssues(issues);
      const frontendIssues = this.issueRouter.getFrontendIssues(issues);

      if (iteration === MAX_QA_ITERATIONS) {
        qaIterationsCount.observe({}, iteration);
        if (criticalIssues.length > 0) {
          state.status.stage       = 'FAILED';
          state.status.stage_status = 'failed';
          state.status.error       = `QA hard failure: ${criticalIssues.length} critical issue(s) after ${MAX_QA_ITERATIONS} iterations`;
          stagesTotal.inc({ stage: 'QA_VALIDATION', status: 'failed' });
        } else {
          state.status.stage       = 'PENDING_REVIEW';
          state.status.stage_status = 'skipped';
          stagesTotal.inc({ stage: 'QA_VALIDATION', status: 'pending_review' });
        }
        return state;
      }

      if (backendIssues.length > 0 && backendSpec) {
        this.logger.info(`Re-running BACKEND_GEN for ${backendIssues.length} backend issue(s)`);
        const idx = state.status.completed_stages.indexOf('BACKEND_GEN');
        if (idx !== -1) state.status.completed_stages.splice(idx, 1);
        state = await executor.execute(state, backendSpec, router, budget);
        if (state.status.stage === 'FAILED') return state;
      }

      if (frontendIssues.length > 0 && frontendSpec) {
        this.logger.info(`Re-running FRONTEND_GEN for ${frontendIssues.length} frontend issue(s)`);
        const idx = state.status.completed_stages.indexOf('FRONTEND_GEN');
        if (idx !== -1) state.status.completed_stages.splice(idx, 1);
        state = await executor.execute(state, frontendSpec, router, budget);
        if (state.status.stage === 'FAILED') return state;
      }
    }

    return state;
  }
}
