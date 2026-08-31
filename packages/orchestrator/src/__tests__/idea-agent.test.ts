import { IdeaAgent, SPEC_SCHEMA } from '../agents/idea-agent';
import { IModelRouter, IBudgetController, LLMClient } from '../agents/interfaces';
import { makeProjectState } from './helpers/state-fixture';

const SPEC_FIXTURE = {
  title: 'Team Todo',
  summary: 'Offline-first todo app for remote teams',
  problem_statement: 'Remote teams lose track of tasks across timezones',
  goals: ['Ship an MVP'],
  target_users: [{ name: 'Remote worker', description: 'Works async', needs: ['offline sync'] }],
  features: [
    {
      name: 'Task list',
      description: 'CRUD for tasks',
      priority: 'must-have',
      user_stories: ['As a user I can add a task'],
    },
  ],
  success_metrics: [{ metric: 'WAU', target: '1000' }],
  assumptions: ['Mobile-first'],
  open_questions: ['Which auth provider?'],
};

function makeMocks(content: string = JSON.stringify(SPEC_FIXTURE)) {
  const complete = jest.fn().mockResolvedValue({
    content,
    usage: { model: 'claude-sonnet-5', input_tokens: 900, output_tokens: 400 },
  });
  const client: LLMClient = { modelId: 'claude-sonnet-5', complete };
  const router: IModelRouter = {
    select: jest.fn().mockResolvedValue(client),
    forceTier: jest.fn(),
    resetForcedTier: jest.fn(),
  };
  const budget: IBudgetController = {
    preAuthorize: jest.fn().mockResolvedValue(undefined),
    recordUsage: jest.fn().mockResolvedValue(undefined),
    pipelineGate: jest.fn().mockResolvedValue(undefined),
    getRemaining: jest.fn().mockReturnValue(25),
    getState: jest.fn(),
  };
  return { complete, router, budget };
}

describe('IdeaAgent', () => {
  test('produces a spec patch on its owned key and records usage', async () => {
    const { complete, router, budget } = makeMocks();
    const agent = new IdeaAgent(router, budget);
    const state = makeProjectState();

    const response = await agent.execute(state);

    expect(response.status).toBe('ok');
    expect(response.patch).toEqual({ spec: SPEC_FIXTURE });
    expect(agent.OWNED_KEYS).toEqual(['spec']);
    expect(response.cost_estimate).toMatchObject({
      model: 'claude-sonnet-5',
      input_tokens: 900,
      output_tokens: 400,
    });
    expect(response.cost_estimate.cost_usd).toBeCloseTo(900 * 0.000002 + 400 * 0.00001);
    expect(budget.recordUsage).toHaveBeenCalledWith({
      model: 'claude-sonnet-5',
      input_tokens: 900,
      output_tokens: 400,
    });

    const callArgs = complete.mock.calls[0][0];
    expect(callArgs.system).toContain('product manager');
    expect(callArgs.user).toContain(state.inputs.raw_idea);
    expect(callArgs.responseSchema).toBe(SPEC_SCHEMA);
  });

  test('returns needs_info when the raw idea is too short', async () => {
    const { complete, router, budget } = makeMocks();
    const agent = new IdeaAgent(router, budget);

    const response = await agent.execute(makeProjectState({ rawIdea: 'app' }));

    expect(response.status).toBe('needs_info');
    expect(complete).not.toHaveBeenCalled();
  });

  test('returns an error response when the model output is not JSON', async () => {
    const { router, budget } = makeMocks('this is not json');
    const agent = new IdeaAgent(router, budget);

    const response = await agent.execute(makeProjectState());

    expect(response.status).toBe('error');
    expect(response.logs[0]).toMatchObject({ level: 'error' });
  });

  test('returns an error response when the LLM call throws', async () => {
    const { complete, router, budget } = makeMocks();
    complete.mockRejectedValue(new Error('rate limited'));
    const agent = new IdeaAgent(router, budget);

    const response = await agent.execute(makeProjectState());

    expect(response.status).toBe('error');
  });
});
