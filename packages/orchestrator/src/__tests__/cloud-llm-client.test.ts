import type Anthropic from '@anthropic-ai/sdk';
import { CloudLLMClient } from '../routing/model-router';
import {
  AgentExecutionError,
  MODEL_TIERS,
  MODEL_COSTS_PER_TOKEN,
} from '@manipula/shared';

function makeResponse(overrides: Record<string, unknown> = {}) {
  return {
    content: [{ type: 'text', text: '{"ok":true}' }],
    stop_reason: 'end_turn',
    stop_details: null,
    usage: { input_tokens: 120, output_tokens: 45 },
    ...overrides,
  };
}

function makeStub(response: Record<string, unknown> = makeResponse()) {
  const create = jest.fn().mockResolvedValue(response);
  const client = { beta: { messages: { create } } } as unknown as Anthropic;
  return { client, create };
}

describe('CloudLLMClient', () => {
  test('sends model, max_tokens, system, and user message', async () => {
    const { client, create } = makeStub();
    await new CloudLLMClient('claude-sonnet-5', 'key', { client }).complete({
      system: 'sys prompt',
      user: 'user prompt',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-5',
        max_tokens: 16000,
        system: 'sys prompt',
        messages: [{ role: 'user', content: 'user prompt' }],
      })
    );
  });

  test('passes responseSchema as structured output_config', async () => {
    const { client, create } = makeStub();
    const schema = { type: 'object', properties: { ok: { type: 'boolean' } } };
    await new CloudLLMClient('claude-sonnet-5', 'key', { client }).complete({
      system: 's',
      user: 'u',
      responseSchema: schema,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        output_config: { format: { type: 'json_schema', schema } },
      })
    );
  });

  test('omits output_config when no responseSchema is given', async () => {
    const { client, create } = makeStub();
    await new CloudLLMClient('claude-sonnet-5', 'key', { client }).complete({
      system: 's',
      user: 'u',
    });

    expect(create.mock.calls[0][0]).not.toHaveProperty('output_config');
  });

  test('enables refusal fallbacks by default for claude-opus-5 only', async () => {
    const opus = makeStub();
    await new CloudLLMClient('claude-opus-5', 'key', { client: opus.client }).complete({
      system: 's',
      user: 'u',
    });
    expect(opus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      })
    );

    const sonnet = makeStub();
    await new CloudLLMClient('claude-sonnet-5', 'key', { client: sonnet.client }).complete({
      system: 's',
      user: 'u',
    });
    expect(sonnet.create.mock.calls[0][0]).not.toHaveProperty('fallbacks');
  });

  test('never forwards temperature or seed to the API', async () => {
    const { client, create } = makeStub();
    await new CloudLLMClient('claude-opus-5', 'key', { client }).complete({
      system: 's',
      user: 'u',
      temperature: 0.2,
      seed: 42,
    });

    expect(create.mock.calls[0][0]).not.toHaveProperty('temperature');
    expect(create.mock.calls[0][0]).not.toHaveProperty('seed');
  });

  test('returns concatenated text content and usage under its own modelId', async () => {
    const { client } = makeStub(
      makeResponse({
        content: [
          { type: 'thinking', thinking: '' },
          { type: 'text', text: '{"a":' },
          { type: 'text', text: '1}' },
        ],
      })
    );
    const result = await new CloudLLMClient('claude-sonnet-5', 'key', { client }).complete({
      system: 's',
      user: 'u',
    });

    expect(result.content).toBe('{"a":1}');
    expect(result.usage).toEqual({
      model: 'claude-sonnet-5',
      input_tokens: 120,
      output_tokens: 45,
    });
  });

  test('throws AgentExecutionError with category on refusal', async () => {
    const { client } = makeStub(
      makeResponse({
        stop_reason: 'refusal',
        stop_details: { type: 'refusal', category: 'cyber', explanation: 'nope' },
      })
    );
    await expect(
      new CloudLLMClient('claude-opus-5', 'key', { client }).complete({ system: 's', user: 'u' })
    ).rejects.toThrow(/refused the request \(category: cyber\)/);
  });

  test('throws AgentExecutionError when output is truncated at max_tokens', async () => {
    const { client } = makeStub(makeResponse({ stop_reason: 'max_tokens' }));
    await expect(
      new CloudLLMClient('claude-sonnet-5', 'key', { client }).complete({ system: 's', user: 'u' })
    ).rejects.toThrow(AgentExecutionError);
  });

  test('respects a custom maxTokens option', async () => {
    const { client, create } = makeStub();
    await new CloudLLMClient('claude-sonnet-5', 'key', { client, maxTokens: 4096 }).complete({
      system: 's',
      user: 'u',
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ max_tokens: 4096 }));
  });
});

describe('model tier / cost table consistency', () => {
  test('every cloud model in MODEL_TIERS has a price in MODEL_COSTS_PER_TOKEN', () => {
    const tierModels = Object.values(MODEL_TIERS).flat();
    for (const modelId of tierModels) {
      expect(MODEL_COSTS_PER_TOKEN[modelId]).toBeDefined();
    }
  });

  test('cloud model prices are positive and local models are free', () => {
    for (const [modelId, rates] of Object.entries(MODEL_COSTS_PER_TOKEN)) {
      if (modelId.startsWith('claude')) {
        expect(rates.input).toBeGreaterThan(0);
        expect(rates.output).toBeGreaterThan(rates.input);
      } else {
        expect(rates.input).toBe(0);
        expect(rates.output).toBe(0);
      }
    }
  });
});
