import { StateMachine } from '../engine/state-machine';
import { OrchestratorProjectState, InvalidTransitionError } from '@manipula/shared';

function makeState(stage: OrchestratorProjectState['status']['stage']): OrchestratorProjectState {
  return {
    meta: {
      id: 'proj_test1234', version: 1, schema_version: '2.1.0',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      owner_id: 'user_1', project_name: 'Test', snapshot_key: null, rollback_history: [],
    },
    status: {
      stage, stage_status: 'pending', iteration: 0, max_iterations: 3,
      awaiting_approval: false, error: null, completed_stages: [], celery_task_id: null,
    },
    inputs: {
      raw_idea: 'Build a test project that does something useful and interesting',
      constraints: [], tech_preferences: {}, approval_required_stages: [],
    },
    spec: null, architecture: null, backend: null, frontend: null, qa: null, infra: null,
    budget: {
      limit_usd: 10, spent_usd: 0,
      token_counts: { input_tokens: 0, output_tokens: 0 },
      stage_costs: {}, iteration_counts: {},
      frozen: false, downgrade_triggered: false, hard_stop_triggered: false,
    },
    logs: [], history: [],
  };
}

describe('StateMachine', () => {
  let sm: StateMachine;
  beforeEach(() => { sm = new StateMachine(); });

  test('valid transition IDLE → SPECIFYING succeeds', () => {
    const next = sm.transition(makeState('IDLE'), 'SPECIFYING');
    expect(next.status.stage).toBe('SPECIFYING');
    expect(next.meta.version).toBe(2);
  });

  test('invalid transition IDLE → BACKEND_GEN throws', () => {
    expect(() => sm.transition(makeState('IDLE'), 'BACKEND_GEN')).toThrow(InvalidTransitionError);
  });

  test('canTransition returns true for valid transition', () => {
    expect(sm.canTransition('IDLE', 'SPECIFYING')).toBe(true);
  });

  test('canTransition returns false for invalid transition', () => {
    expect(sm.canTransition('IDLE', 'DEPLOYING')).toBe(false);
  });

  test('transition increments version', () => {
    const state = makeState('IDLE');
    expect(state.meta.version).toBe(1);
    expect(sm.transition(state, 'SPECIFYING').meta.version).toBe(2);
  });

  test('transition does not mutate original state', () => {
    const state = makeState('IDLE');
    sm.transition(state, 'SPECIFYING');
    expect(state.status.stage).toBe('IDLE');
    expect(state.meta.version).toBe(1);
  });

  test('getValidTransitions returns correct options', () => {
    const transitions = sm.getValidTransitions('SPECIFYING');
    expect(transitions).toContain('ARCHITECTING');
    expect(transitions).toContain('FAILED');
    expect(transitions).not.toContain('DEPLOYING');
  });

  test('QA_VALIDATION can transition back to BACKEND_GEN', () => {
    expect(sm.transition(makeState('QA_VALIDATION'), 'BACKEND_GEN').status.stage).toBe('BACKEND_GEN');
  });
});
