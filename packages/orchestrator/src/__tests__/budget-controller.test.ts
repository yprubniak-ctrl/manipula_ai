import { BudgetController } from '../budget/controller';
import { OrchestratorProjectState, BudgetExhaustedError, StageFrozenError } from '@manipula/shared';

function makeState(limitUsd: number, spentUsd: number): OrchestratorProjectState {
  return {
    meta: {
      id: 'proj_budtest1', version: 1, schema_version: '2.1.0',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      owner_id: 'user_1', project_name: 'Budget Test', snapshot_key: null, rollback_history: [],
    },
    status: {
      stage: 'SPECIFYING', stage_status: 'running', iteration: 0, max_iterations: 3,
      awaiting_approval: false, error: null, completed_stages: [], celery_task_id: null,
    },
    inputs: {
      raw_idea: 'Build a test project that does something useful and interesting',
      constraints: [], tech_preferences: {}, approval_required_stages: [],
    },
    spec: null, architecture: null, backend: null, frontend: null, qa: null, infra: null,
    budget: {
      limit_usd: limitUsd, spent_usd: spentUsd,
      token_counts: { input_tokens: 0, output_tokens: 0 },
      stage_costs: {}, iteration_counts: {},
      frozen: false, downgrade_triggered: false, hard_stop_triggered: false,
    },
    logs: [], history: [],
  };
}

describe('BudgetController', () => {
  test('getRemaining returns correct value', () => {
    expect(new BudgetController(makeState(10, 3)).getRemaining()).toBeCloseTo(7);
  });

  test('getUtilizationRatio returns correct ratio', () => {
    expect(new BudgetController(makeState(10, 5)).getUtilizationRatio()).toBeCloseTo(0.5);
  });

  test('recordUsage updates spent_usd and token counts', async () => {
    const state = makeState(10, 0);
    await new BudgetController(state).recordUsage({ model: 'claude-haiku-4', input_tokens: 1000, output_tokens: 500 });
    expect(state.budget.spent_usd).toBeGreaterThan(0);
    expect(state.budget.token_counts.input_tokens).toBe(1000);
    expect(state.budget.token_counts.output_tokens).toBe(500);
  });

  test('pipelineGate throws BudgetExhaustedError when < 2% remaining', async () => {
    const state = makeState(100, 99);
    await expect(new BudgetController(state).pipelineGate('SPECIFYING')).rejects.toThrow(BudgetExhaustedError);
    expect(state.budget.hard_stop_triggered).toBe(true);
  });

  test('pipelineGate throws StageFrozenError for non-core stage at < 10% remaining', async () => {
    const state = makeState(100, 91);
    await expect(new BudgetController(state).pipelineGate('FRONTEND_GEN')).rejects.toThrow(StageFrozenError);
    expect(state.budget.frozen).toBe(true);
  });

  test('pipelineGate sets downgrade_triggered when < 30% remaining', async () => {
    const state      = makeState(100, 75);
    const mockRouter = { forceTier: jest.fn(), select: jest.fn(), resetForcedTier: jest.fn() };
    await new BudgetController(state, undefined, mockRouter).pipelineGate('SPECIFYING');
    expect(state.budget.downgrade_triggered).toBe(true);
    expect(mockRouter.forceTier).toHaveBeenCalledWith('low');
  });

  test('pipelineGate does not trigger downgrade twice', async () => {
    const state      = makeState(100, 75);
    const mockRouter = { forceTier: jest.fn(), select: jest.fn(), resetForcedTier: jest.fn() };
    const ctrl       = new BudgetController(state, undefined, mockRouter);
    await ctrl.pipelineGate('SPECIFYING');
    await ctrl.pipelineGate('SPECIFYING');
    expect(mockRouter.forceTier).toHaveBeenCalledTimes(1);
  });

  test('preAuthorize throws when estimated cost exceeds limit', async () => {
    const state = makeState(1, 0.99);
    await expect(new BudgetController(state).preAuthorize('claude-opus-4', 1000000)).rejects.toThrow(BudgetExhaustedError);
  });
});
