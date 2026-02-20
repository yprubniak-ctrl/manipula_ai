/**
 * Budget controller with three-tier gate system.
 */

import {
  OrchestratorProjectState,
  BudgetThresholds,
  DEFAULT_BUDGET_THRESHOLDS,
  NON_CORE_STAGES,
  OrchestratorStage,
  BudgetExhaustedError,
  StageFrozenError,
} from '@manipula/shared';
import { IBudgetController, IModelRouter, LLMUsage } from '../agents/interfaces';
import { calculateCost, estimatePreAuthCost } from './costs';

/**
 * Singleton per project execution.
 * Controls LLM spend through pre-authorization, usage recording, and gate checks.
 */
export class BudgetController implements IBudgetController {
  private readonly thresholds: BudgetThresholds;
  private modelRouter?: IModelRouter;

  constructor(
    private readonly state: OrchestratorProjectState,
    thresholds: BudgetThresholds = DEFAULT_BUDGET_THRESHOLDS,
    modelRouter?: IModelRouter
  ) {
    this.thresholds = thresholds;
    this.modelRouter = modelRouter;

    if (!this.state.budget.token_counts) {
      this.state.budget.token_counts = { input_tokens: 0, output_tokens: 0 };
    }
    if (!this.state.budget.stage_costs) {
      this.state.budget.stage_costs = {};
    }
    if (!this.state.budget.iteration_counts) {
      this.state.budget.iteration_counts = {};
    }
  }

  async preAuthorize(modelId: string, estimatedTokens: number): Promise<void> {
    const estimatedCost = estimatePreAuthCost(modelId, estimatedTokens);
    const projectedSpend = this.state.budget.spent_usd + estimatedCost;
    const projectedRatio = projectedSpend / this.state.budget.limit_usd;

    if (projectedRatio >= (1 - this.thresholds.hard_stop)) {
      this.state.budget.hard_stop_triggered = true;
      throw new BudgetExhaustedError(
        `Pre-authorization denied: projected spend $${projectedSpend.toFixed(4)} ` +
        `exceeds budget limit $${this.state.budget.limit_usd}`
      );
    }
  }

  async recordUsage(usage: LLMUsage): Promise<void> {
    const actual = calculateCost(usage.model, usage.input_tokens, usage.output_tokens);
    this.state.budget.spent_usd += actual;
    this.state.budget.token_counts.input_tokens += usage.input_tokens;
    this.state.budget.token_counts.output_tokens += usage.output_tokens;

    const stage = this.state.status.stage;
    this.state.budget.stage_costs[stage] =
      (this.state.budget.stage_costs[stage] ?? 0) + actual;
  }

  /**
   * Pipeline gate — enforces budget thresholds before each stage.
   */
  async pipelineGate(stageName: string): Promise<void> {
    const remaining = this.getRemaining();
    const ratio = remaining / this.state.budget.limit_usd;

    if (ratio < this.thresholds.hard_stop) {
      this.state.budget.hard_stop_triggered = true;
      throw new BudgetExhaustedError('Hard stop triggered: budget < 2% remaining');
    }

    if (ratio < this.thresholds.freeze && NON_CORE_STAGES.has(stageName as OrchestratorStage)) {
      this.state.budget.frozen = true;
      throw new StageFrozenError(`${stageName} frozen: budget < 10% remaining`);
    }

    if (ratio < this.thresholds.downgrade && !this.state.budget.downgrade_triggered) {
      this.state.budget.downgrade_triggered = true;
      if (this.modelRouter) {
        this.modelRouter.forceTier('low');
      }
    }
  }

  getRemaining(): number {
    return Math.max(0, this.state.budget.limit_usd - this.state.budget.spent_usd);
  }

  getUtilizationRatio(): number {
    if (this.state.budget.limit_usd === 0) return 1;
    return this.state.budget.spent_usd / this.state.budget.limit_usd;
  }

  getState(): OrchestratorProjectState['budget'] {
    return this.state.budget;
  }
}
