import { OrchestratorProjectState } from '@manipula/shared';
import { ArchAgent, ARCHITECTURE_SCHEMA } from '../agents/arch-agent';
import { BackendAgent, BACKEND_SCHEMA } from '../agents/backend-agent';
import { FrontendAgent, FRONTEND_SCHEMA } from '../agents/frontend-agent';
import { QAAgent, QA_SCHEMA } from '../agents/qa-agent';
import { DeployAgent, INFRA_SCHEMA } from '../agents/deploy-agent';
import { BaseAgent } from '../agents/base-agent';
import { IModelRouter, IBudgetController, LLMClient } from '../agents/interfaces';
import { makeProjectState } from './helpers/state-fixture';
import {
  SPEC_FIXTURE,
  ARCH_FIXTURE,
  BACKEND_FIXTURE,
  FRONTEND_FIXTURE,
  QA_PASS_FIXTURE,
  INFRA_FIXTURE,
} from './helpers/fixtures';

function makeMocks(fixture: unknown) {
  const complete = jest.fn().mockResolvedValue({
    content: JSON.stringify(fixture),
    usage: { model: 'claude-sonnet-5', input_tokens: 500, output_tokens: 300 },
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

function makeFullState(): OrchestratorProjectState {
  const state = makeProjectState();
  state.spec = SPEC_FIXTURE as unknown as Record<string, unknown>;
  state.architecture = ARCH_FIXTURE as unknown as Record<string, unknown>;
  state.backend = BACKEND_FIXTURE as unknown as Record<string, unknown>;
  state.frontend = FRONTEND_FIXTURE as unknown as Record<string, unknown>;
  state.qa = QA_PASS_FIXTURE as unknown as Record<string, unknown>;
  return state;
}

interface AgentCase {
  name: string;
  Agent: new (router: IModelRouter, budget: IBudgetController) => BaseAgent;
  stageKey: string;
  fixture: unknown;
  schema: Record<string, unknown>;
  userMustContain: string;
}

const CASES: AgentCase[] = [
  {
    name: 'ArchAgent',
    Agent: ArchAgent,
    stageKey: 'architecture',
    fixture: ARCH_FIXTURE,
    schema: ARCHITECTURE_SCHEMA,
    userMustContain: 'Team Todo',
  },
  {
    name: 'BackendAgent',
    Agent: BackendAgent,
    stageKey: 'backend',
    fixture: BACKEND_FIXTURE,
    schema: BACKEND_SCHEMA,
    userMustContain: 'Express',
  },
  {
    name: 'FrontendAgent',
    Agent: FrontendAgent,
    stageKey: 'frontend',
    fixture: FRONTEND_FIXTURE,
    schema: FRONTEND_SCHEMA,
    userMustContain: 'React',
  },
  {
    name: 'QAAgent',
    Agent: QAAgent,
    stageKey: 'qa',
    fixture: QA_PASS_FIXTURE,
    schema: QA_SCHEMA,
    userMustContain: 'Generated backend',
  },
  {
    name: 'DeployAgent',
    Agent: DeployAgent,
    stageKey: 'infra',
    fixture: INFRA_FIXTURE,
    schema: INFRA_SCHEMA,
    userMustContain: 'deployment setup',
  },
];

describe.each(CASES)('$name', ({ Agent, stageKey, fixture, schema, userMustContain }) => {
  test(`patches only its owned key "${stageKey}"`, async () => {
    const { complete, router, budget } = makeMocks(fixture);
    const agent = new Agent(router, budget);
    const response = await agent.execute(makeFullState());

    expect(response.status).toBe('ok');
    expect(response.patch).toEqual({ [stageKey]: fixture });
    expect(agent.OWNED_KEYS).toEqual([stageKey]);
    expect(response.cost_estimate.cost_usd).toBeGreaterThan(0);

    const callArgs = complete.mock.calls[0][0];
    expect(callArgs.responseSchema).toBe(schema);
    expect(callArgs.user.toLowerCase()).toContain(userMustContain.toLowerCase());
  });

  test('returns an error response when the model output is not JSON', async () => {
    const { complete, router, budget } = makeMocks(fixture);
    complete.mockResolvedValue({
      content: 'not json',
      usage: { model: 'claude-sonnet-5', input_tokens: 1, output_tokens: 1 },
    });
    const response = await new Agent(router, budget).execute(makeFullState());
    expect(response.status).toBe('error');
  });
});
