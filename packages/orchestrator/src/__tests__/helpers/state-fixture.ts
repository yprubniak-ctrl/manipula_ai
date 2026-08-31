import { OrchestratorProjectState } from '@manipula/shared';

export function makeProjectState(
  overrides: { id?: string; rawIdea?: string; budgetLimit?: number } = {}
): OrchestratorProjectState {
  const now = new Date().toISOString();
  return {
    meta: {
      id: overrides.id ?? 'proj_test1',
      version: 1,
      schema_version: '2.1.0',
      created_at: now,
      updated_at: now,
      owner_id: 'test',
      project_name: 'Test Project',
      snapshot_key: null,
      rollback_history: [],
    },
    status: {
      stage: 'IDLE',
      stage_status: 'pending',
      iteration: 0,
      max_iterations: 3,
      awaiting_approval: false,
      error: null,
      completed_stages: [],
      celery_task_id: null,
    },
    inputs: {
      raw_idea: overrides.rawIdea ?? 'A todo app for remote teams with offline sync',
      constraints: [],
      tech_preferences: {},
      approval_required_stages: [],
    },
    spec: null,
    architecture: null,
    backend: null,
    frontend: null,
    qa: null,
    infra: null,
    budget: {
      limit_usd: overrides.budgetLimit ?? 25,
      spent_usd: 0,
      token_counts: { input_tokens: 0, output_tokens: 0 },
      stage_costs: {},
      iteration_counts: {},
      frozen: false,
      downgrade_triggered: false,
      hard_stop_triggered: false,
    },
    logs: [],
    history: [],
  };
}
