/**
 * BaseAgent abstract class providing LLM integration with budget/routing support.
 */

import {
  OrchestratorProjectState,
  AgentResponse,
  StageComplexity,
  AgentExecutionError,
} from '@manipula/shared';
import { IAgent, IModelRouter, IBudgetController, LLMResponse } from './interfaces';

/**
 * Abstract base class for all orchestrator agents.
 * Subclasses must define OWNED_KEYS and implement execute().
 */
export abstract class BaseAgent implements IAgent {
  abstract readonly OWNED_KEYS: string[];

  constructor(
    protected readonly router: IModelRouter,
    protected readonly budget: IBudgetController
  ) {}

  abstract execute(state: OrchestratorProjectState): Promise<AgentResponse>;

  async estimateCost(_state: OrchestratorProjectState): Promise<{ tokens: number; cost_usd: number }> {
    return { tokens: 5000, cost_usd: 0 };
  }

  /**
   * Call the LLM with structured output support.
   * Handles budget pre-authorization and usage recording automatically.
   */
  protected async callLLM(
    system: string,
    user: string,
    schema: Record<string, unknown>,
    complexity: StageComplexity = 'medium'
  ): Promise<LLMResponse> {
    const modelClient = await this.router.select(complexity);
    await this.budget.preAuthorize(modelClient.modelId, 5000);
    const response = await modelClient.complete({
      system,
      user,
      responseSchema: schema,
      temperature: 0.2,
      seed: 42,
    });
    await this.budget.recordUsage(response.usage);
    return response;
  }

  protected buildSuccessResponse(
    patch: Record<string, unknown>,
    costEstimate: { model: string; input_tokens: number; output_tokens: number; cost_usd: number },
    warnings: string[] = [],
    logs: Record<string, unknown>[] = []
  ): AgentResponse {
    return {
      status: 'ok',
      patch,
      cost_estimate: costEstimate,
      warnings,
      logs,
    };
  }

  protected buildErrorResponse(
    error: unknown,
    logs: Record<string, unknown>[] = []
  ): AgentResponse {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      patch: {},
      cost_estimate: { input_tokens: 0, output_tokens: 0, model: 'unknown', cost_usd: 0 },
      warnings: [],
      logs: [{ level: 'error', message }, ...logs],
    };
  }

  protected buildNeedsInfoResponse(message: string): AgentResponse {
    if (!message) {
      throw new AgentExecutionError('needs-info message must not be empty');
    }
    return {
      status: 'needs_info',
      patch: {},
      cost_estimate: { input_tokens: 0, output_tokens: 0, model: 'unknown', cost_usd: 0 },
      warnings: [message],
      logs: [],
    };
  }
}
