/**
 * Hybrid model router — tier-based selection with local-first preference and cloud fallback.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  StageComplexity,
  MODEL_TIERS,
  NoAvailableModelError,
  AgentExecutionError,
} from '@manipula/shared';
import { IModelRouter, LLMClient, LLMResponse } from '../agents/interfaces';
import { LocalNode } from './health-checker';

// ============================================================================
// Cloud LLM Client (Anthropic)
// ============================================================================

/** Models that support server-side refusal fallbacks (beta). */
const REFUSAL_FALLBACK_MODELS = new Set(['claude-opus-5', 'claude-fable-5']);

export interface CloudLLMClientOptions {
  maxTokens?: number;
  /** Defaults to true for models in REFUSAL_FALLBACK_MODELS. */
  enableRefusalFallbacks?: boolean;
  /** Injectable for testing. */
  client?: Anthropic;
}

export class CloudLLMClient implements LLMClient {
  private readonly anthropic: Anthropic;
  private readonly maxTokens: number;
  private readonly enableRefusalFallbacks: boolean;

  constructor(
    public readonly modelId: string,
    apiKey: string,
    options: CloudLLMClientOptions = {}
  ) {
    this.anthropic = options.client ?? new Anthropic({ apiKey });
    this.maxTokens = options.maxTokens ?? 16_000;
    this.enableRefusalFallbacks =
      options.enableRefusalFallbacks ?? REFUSAL_FALLBACK_MODELS.has(modelId);
  }

  async complete(params: {
    system: string;
    user: string;
    responseSchema?: Record<string, unknown>;
    temperature?: number;
    seed?: number;
  }): Promise<LLMResponse> {
    // temperature/seed are intentionally not forwarded: current Claude models
    // (Opus 5 / Sonnet 5 / 4.7+) reject sampling parameters with a 400, and the
    // API has no seed support. Only the local Ollama client honors them.
    const response = await this.anthropic.beta.messages.create({
      model: this.modelId,
      max_tokens: this.maxTokens,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
      ...(params.responseSchema
        ? {
            output_config: {
              format: { type: 'json_schema' as const, schema: params.responseSchema },
            },
          }
        : {}),
      ...(this.enableRefusalFallbacks
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : {}),
    });

    if (response.stop_reason === 'refusal') {
      const details = response.stop_details;
      throw new AgentExecutionError(
        `Model ${this.modelId} refused the request` +
          (details?.category ? ` (category: ${details.category})` : ''),
        { explanation: details?.explanation }
      );
    }

    if (response.stop_reason === 'max_tokens') {
      throw new AgentExecutionError(
        `Model ${this.modelId} response truncated at max_tokens=${this.maxTokens}`
      );
    }

    const content = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      usage: {
        model: this.modelId,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
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
      // Ollama structured outputs: constrain the response to the JSON schema
      ...(params.responseSchema ? { format: params.responseSchema } : {}),
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
