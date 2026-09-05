import { LocalLLMClient } from '../routing/model-router';
import { LocalNode } from '../routing/health-checker';

describe('LocalLLMClient', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"x":1}' },
        prompt_eval_count: 10,
        eval_count: 5,
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function makeClient(): LocalLLMClient {
    return new LocalLLMClient('ollama/llama3:8b', new LocalNode('http://localhost:11434'));
  }

  test('forwards responseSchema as the Ollama structured-output format', async () => {
    const schema = { type: 'object', properties: { x: { type: 'number' } } };
    const result = await makeClient().complete({
      system: 's',
      user: 'u',
      responseSchema: schema,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.format).toEqual(schema);
    expect(body.model).toBe('llama3:8b');
    expect(result.content).toBe('{"x":1}');
    expect(result.usage).toEqual({
      model: 'ollama/llama3:8b',
      input_tokens: 10,
      output_tokens: 5,
    });
  });

  test('omits format when no responseSchema is given', async () => {
    await makeClient().complete({ system: 's', user: 'u' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('format');
  });

  test('honors temperature and seed for local models', async () => {
    await makeClient().complete({ system: 's', user: 'u', temperature: 0.7, seed: 7 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.options).toEqual({ temperature: 0.7, seed: 7 });
  });
});
