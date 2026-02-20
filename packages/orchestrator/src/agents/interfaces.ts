/**
 * Agent contracts and interfaces for the orchestrator system.
 */

import {
  OrchestratorProjectState,
  AgentResponse,
  StageComplexity,
} from '@manipula/shared';

export interface LLMUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
}

export interface LLMClient {
  modelId: string;
  complete(params: {
    system: string;
    user: string;
    responseSchema?: Record<string, unknown>;
    temperature?: number;
    seed?: number;
  }): Promise<LLMResponse>;
}

export interface IModelRouter {
  select(complexity: StageComplexity): Promise<LLMClient>;
  forceTier(tier: StageComplexity): void;
  resetForcedTier(): void;
}

export interface IBudgetController {
  preAuthorize(modelId: string, estimatedTokens: number): Promise<void>;
  recordUsage(usage: LLMUsage): Promise<void>;
  pipelineGate(stageName: string): Promise<void>;
  getRemaining(): number;
  getState(): OrchestratorProjectState['budget'];
}

export interface IAgent {
  readonly OWNED_KEYS: string[];
  execute(state: OrchestratorProjectState): Promise<AgentResponse>;
  estimateCost(state: OrchestratorProjectState): Promise<{ tokens: number; cost_usd: number }>;
}
