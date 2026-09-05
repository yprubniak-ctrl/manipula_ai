/**
 * Shared base for stage agents that call the LLM once with a JSON response
 * schema and patch the parsed result onto a single owned state key.
 */

import { AgentResponse, StageComplexity } from '@manipula/shared';
import { BaseAgent } from './base-agent';
import { calculateCost } from '../budget/costs';

export abstract class JsonStageAgent extends BaseAgent {
  protected async runJsonStage(
    stageKey: string,
    system: string,
    user: string,
    schema: Record<string, unknown>,
    complexity: StageComplexity
  ): Promise<AgentResponse> {
    try {
      const response = await this.callLLM(system, user, schema, complexity);

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(response.content) as Record<string, unknown>;
      } catch {
        return this.buildErrorResponse(
          new Error(`${this.constructor.name}: model response was not valid JSON`)
        );
      }

      const { model, input_tokens, output_tokens } = response.usage;
      return this.buildSuccessResponse(
        { [stageKey]: parsed },
        {
          model,
          input_tokens,
          output_tokens,
          cost_usd: calculateCost(model, input_tokens, output_tokens),
        }
      );
    } catch (err) {
      return this.buildErrorResponse(err);
    }
  }
}
