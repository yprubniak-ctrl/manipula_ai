import {
  AgentType,
  AgentInput,
  AgentOutput,
  ExecutionStatus,
  StatePatch,
  Artifact,
  AgentExecutionError,
} from '@manipula/shared';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Base Agent Class
// ============================================================================

export abstract class BaseAgent {
  protected agentType: AgentType;
  protected config: AgentConfig;

  constructor(agentType: AgentType, config: AgentConfig = {}) {
    this.agentType = agentType;
    this.config = {
      max_retries: 3,
      timeout_seconds: 300,
      model_provider: 'openai',
      model_name: 'gpt-4-turbo-preview',
      ...config,
    };
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Validate input before execution
   */
  protected validateInput(input: AgentInput): void {
    if (!input.project_id) {
      throw new AgentExecutionError('Missing project_id in input');
    }

    if (!input.state) {
      throw new AgentExecutionError('Missing state in input');
    }
  }

  /**
   * Create success output
   */
  protected createSuccessOutput(
    patches: StatePatch[],
    artifacts?: Artifact[],
    cost_usd?: number
  ): AgentOutput {
    return {
      status: ExecutionStatus.COMPLETED,
      patches,
      artifacts,
      cost_usd,
    };
  }

  /**
   * Create error output
   */
  protected createErrorOutput(error: string, cost_usd?: number): AgentOutput {
    return {
      status: ExecutionStatus.FAILED,
      patches: [],
      error,
      cost_usd,
    };
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      type: this.agentType,
      config: this.config,
    };
  }
}

// ============================================================================
// AI Model Client Wrapper
// ============================================================================

export class AIModelClient {
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor(config: { openai_key?: string; anthropic_key?: string }) {
    if (config.openai_key) {
      this.openai = new OpenAI({ apiKey: config.openai_key });
    }

    if (config.anthropic_key) {
      this.anthropic = new Anthropic({ apiKey: config.anthropic_key });
    }
  }

  /**
   * Generate text using specified model
   */
  async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const { provider, model, prompt, system, max_tokens = 4096 } = params;

    let response: string;
    let cost_usd = 0;

    try {
      if (provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: model || 'gpt-4-turbo-preview',
          messages: [
            ...(system ? [{ role: 'system' as const, content: system }] : []),
            { role: 'user' as const, content: prompt },
          ],
          max_tokens,
        });

        response = completion.choices[0]?.message?.content || '';
        cost_usd = this.estimateOpenAICost(model || 'gpt-4-turbo-preview', {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
        });
      } else if (provider === 'anthropic' && this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens,
          system: system || undefined,
          messages: [{ role: 'user', content: prompt }],
        });

        response =
          message.content
            .filter((block) => block.type === 'text')
            .map((block) => ('text' in block ? block.text : ''))
            .join('') || '';

        cost_usd = this.estimateAnthropicCost(model || 'claude-3-5-sonnet-20241022', {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        });
      } else {
        throw new AgentExecutionError(
          `Unsupported provider: ${provider} or missing API key`
        );
      }

      return { text: response, cost_usd };
    } catch (error: any) {
      throw new AgentExecutionError(`AI generation failed: ${error.message}`, {
        provider,
        model,
        error: error.message,
      });
    }
  }

  /**
   * Estimate OpenAI costs
   */
  private estimateOpenAICost(
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number }
  ): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4-turbo-preview'];
    return (
      usage.prompt_tokens * modelPricing.input +
      usage.completion_tokens * modelPricing.output
    );
  }

  /**
   * Estimate Anthropic costs
   */
  private estimateAnthropicCost(
    model: string,
    usage: { input_tokens: number; output_tokens: number }
  ): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 },
      'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
      'claude-3-haiku-20240307': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
    };

    const modelPricing = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
    return (
      usage.input_tokens * modelPricing.input + usage.output_tokens * modelPricing.output
    );
  }
}

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  max_retries?: number;
  timeout_seconds?: number;
  model_provider?: 'openai' | 'anthropic' | 'local';
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface GenerateTextParams {
  provider: 'openai' | 'anthropic';
  model?: string;
  prompt: string;
  system?: string;
  max_tokens?: number;
}

export interface GenerateTextResult {
  text: string;
  cost_usd: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createArtifact(
  type: Artifact['type'],
  path: string,
  content?: string,
  metadata?: Record<string, any>
): Artifact {
  return {
    id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    path,
    content,
    metadata,
  };
}

export function parseJSONSafely<T = any>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function extractCodeBlocks(text: string, language?: string): string[] {
  const regex = language
    ? new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'g')
    : /```[\w]*\n([\s\S]*?)\n```/g;

  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}
