/**
 * Hybrid model router — tier-based selection with local-first preference and cloud fallback.
 */

import {
  StageComplexity,
  MODEL_TIERS,
  NoAvailableModelError,
} from '@manipula/shared';
import { IModelRouter, LLMClient, LLMResponse } from '../agents/interfaces';
import { LocalNode } from './health-checker';

// ============================================================================
// Cloud LLM Client
// ============================================================================

export class CloudLLMClient implements LLMClient {
  constructor(
    public readonly modelId: string,
    _apiKey: string
  ) {}

  async complete(_params: {
    system: string;
    user: string;
    responseSchema?: Record<string, unknown>;
    temperature?: number;
    seed?: number;
  }): Promise<LLMResponse> {
    throw new Error(
      `CloudLLMClient.complete not implemented for ${this.modelId}. ` +
      `Provide a real implementation or inject a mock for testing.`
    );
  }
}

// ============================================================================
// Local Ollama Client
// ============================================================================

export class LocalLLMClient implements LLMClient {
  constructor(
    public readonly modelId: string,
    private readonly node: LocalNode
  ) {}

  async complete(params: {
    system: string;
    user: string;
    responseSchema?: Record<string, unknown>;
    temperature?: number;
    seed?: number;
  }): Promise<LLMResponse> {
    const body = {
      model: this.modelId.replace('ollama/', ''),
      messages: [
        { role: 'system', content: params.system },
        { role: 'user',   content: params.user   },
      ],
      stream: false,
      options: {
        temperature: params.temperature ?? 0.2,
        seed: params.seed ?? 42,
      },
    };

    const resp = await fetch(`${this.node.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    });

    if (!resp.ok) {
      throw new Error(`Ollama request failed: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as {
      message: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      content: data.message.content,
      usage: {
        model: this.modelId,
        input_tokens: data.prompt_eval_count ?? 0,
        output_tokens: data.eval_count ?? 0,
      },
    };
  }
}

// ============================================================================
// ModelRouter
// ============================================================================

export interface ModelRouterConfig {
  ollamaNodes: string[];
  ollamaEnabled: boolean;
  cloudApiKey: string;
}

/**
 * Hybrid model router implementing tier-based selection with local-first
 * preference and automatic cloud fallback.
 */
export class ModelRouter implements IModelRouter {
  private forcedTier: StageComplexity | null = null;
  private readonly nodes: LocalNode[];

  constructor(private readonly config: ModelRouterConfig) {
    this.nodes = config.ollamaNodes.map((url) => new LocalNode(url));
  }

  async select(complexity: StageComplexity): Promise<LLMClient> {
    const tier = this.forcedTier ?? complexity;
    const models = MODEL_TIERS[tier];

    for (const modelId of models) {
      if (modelId.startsWith('ollama/')) {
        if (!this.config.ollamaEnabled) continue;
        const node = await this.bestLocalNode();
        if (node && tier !== 'high') {
          return new LocalLLMClient(modelId, node);
        }
      } else if (modelId.startsWith('claude')) {
        if (this.config.cloudApiKey) {
          return new CloudLLMClient(modelId, this.config.cloudApiKey);
        }
      }
    }

    throw new NoAvailableModelError(
      `All models exhausted for tier=${tier}. ` +
      `Ensure Ollama is running or a cloud API key is configured.`
    );
  }

  forceTier(tier: StageComplexity): void {
    this.forcedTier = tier;
  }

  resetForcedTier(): void {
    this.forcedTier = null;
  }

  private async bestLocalNode(): Promise<LocalNode | null> {
    const healthChecks = await Promise.all(
      this.nodes.map(async (n) => ({ node: n, healthy: await n.isHealthy() }))
    );
    const healthy = healthChecks.filter((h) => h.healthy).map((h) => h.node);
    if (healthy.length === 0) return null;
    return healthy.reduce((best, n) => (n.queueDepth < best.queueDepth ? n : best));
  }
}
