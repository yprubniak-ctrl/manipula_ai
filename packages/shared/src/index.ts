// ============================================================================
// Error Base Classes
// ============================================================================

export class ManipulaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ManipulaError';
  }
}

export class AgentExecutionError extends ManipulaError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AGENT_EXECUTION_ERROR', details);
    this.name = 'AgentExecutionError';
  }
}

// ============================================================================
// Orchestrator Stage Types (Spec Section 2.3 / 5)
// ============================================================================

export type OrchestratorStage =
  | 'IDLE'
  | 'SPECIFYING'
  | 'ARCHITECTING'
  | 'BACKEND_GEN'
  | 'FRONTEND_GEN'
  | 'QA_VALIDATION'
  | 'DEPLOYING'
  | 'COMPLETE'
  | 'FAILED'
  | 'PAUSED'
  | 'PENDING_REVIEW';

export type StageStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export const VALID_TRANSITIONS: Record<OrchestratorStage, OrchestratorStage[]> = {
  IDLE:           ['SPECIFYING'],
  SPECIFYING:     ['ARCHITECTING', 'FAILED', 'PAUSED', 'PENDING_REVIEW'],
  ARCHITECTING:   ['BACKEND_GEN', 'FAILED', 'PAUSED', 'PENDING_REVIEW'],
  BACKEND_GEN:    ['FRONTEND_GEN', 'FAILED', 'PAUSED', 'PENDING_REVIEW'],
  FRONTEND_GEN:   ['QA_VALIDATION', 'FAILED', 'PAUSED', 'PENDING_REVIEW'],
  QA_VALIDATION:  ['DEPLOYING', 'BACKEND_GEN', 'FRONTEND_GEN', 'FAILED', 'PAUSED', 'PENDING_REVIEW'],
  DEPLOYING:      ['COMPLETE', 'FAILED'],
  COMPLETE:       [],
  FAILED:         [],
  PAUSED:         ['SPECIFYING', 'ARCHITECTING', 'BACKEND_GEN', 'FRONTEND_GEN', 'QA_VALIDATION', 'DEPLOYING'],
  PENDING_REVIEW: ['SPECIFYING', 'ARCHITECTING', 'BACKEND_GEN', 'FRONTEND_GEN', 'QA_VALIDATION', 'DEPLOYING'],
};

/** Maps each stage to the top-level state keys it is allowed to write */
export const STAGE_OWNERSHIP: Record<string, string[]> = {
  SPECIFYING:    ['spec'],
  ARCHITECTING:  ['architecture'],
  BACKEND_GEN:   ['backend'],
  FRONTEND_GEN:  ['frontend'],
  QA_VALIDATION: ['qa'],
  DEPLOYING:     ['infra'],
};

// ============================================================================
// Pipeline Spec Types (Spec Section 5)
// ============================================================================

export type StageComplexity = 'high' | 'medium' | 'low';

export interface StageSpec {
  /** Stage name identifier */
  name: OrchestratorStage;
  /** Agent class name to run for this stage */
  agentName: string;
  /** State keys that must be non-null before this stage can run */
  prerequisites: string[];
  /** Complexity level used for model selection */
  complexity: StageComplexity;
  /** Whether human approval is required before executing this stage */
  approvalCheckpoint?: boolean;
}

export const PIPELINE: StageSpec[] = [
  { name: 'SPECIFYING',    agentName: 'IdeaAgent',     prerequisites: ['inputs.raw_idea'],                 complexity: 'medium' },
  { name: 'ARCHITECTING',  agentName: 'ArchAgent',     prerequisites: ['spec'],                            complexity: 'high' },
  { name: 'BACKEND_GEN',   agentName: 'BackendAgent',  prerequisites: ['spec', 'architecture'],            complexity: 'high' },
  { name: 'FRONTEND_GEN',  agentName: 'FrontendAgent', prerequisites: ['spec', 'architecture', 'backend'], complexity: 'medium' },
  { name: 'QA_VALIDATION', agentName: 'QAAgent',       prerequisites: ['backend', 'frontend'],             complexity: 'medium' },
  { name: 'DEPLOYING',     agentName: 'DeployAgent',   prerequisites: ['backend', 'frontend', 'qa'],       complexity: 'low', approvalCheckpoint: true },
];

// ============================================================================
// Budget Types (Spec Section 7)
// ============================================================================

export interface BudgetState {
  limit_usd: number;
  spent_usd: number;
  token_counts: { input_tokens: number; output_tokens: number };
  stage_costs: Record<string, number>;
  iteration_counts: Record<string, number>;
  frozen: boolean;
  downgrade_triggered: boolean;
  hard_stop_triggered: boolean;
}

export interface BudgetThresholds {
  /** Remaining ratio below which model tier is downgraded */
  downgrade: number;
  /** Remaining ratio below which non-core stages are frozen */
  freeze: number;
  /** Remaining ratio below which execution halts immediately */
  hard_stop: number;
}

export const DEFAULT_BUDGET_THRESHOLDS: BudgetThresholds = {
  downgrade: 0.30,
  freeze:    0.10,
  hard_stop: 0.02,
};

/** Stages that may be skipped when budget is low */
export const NON_CORE_STAGES: Set<OrchestratorStage> = new Set(['FRONTEND_GEN']);

// ============================================================================
// Model Cost Definitions (Spec Section 7)
// ============================================================================

export const MODEL_COSTS_PER_TOKEN: Record<string, { input: number; output: number }> = {
  'claude-opus-4':     { input: 0.000015,   output: 0.000075   },
  'claude-sonnet-4':   { input: 0.000003,   output: 0.000015   },
  'claude-haiku-4':    { input: 0.00000025, output: 0.00000125 },
  'ollama/llama3:70b': { input: 0.0,        output: 0.0        },
  'ollama/llama3:8b':  { input: 0.0,        output: 0.0        },
  'ollama/llama3:1b':  { input: 0.0,        output: 0.0        },
};

// ============================================================================
// Model Routing Types (Spec Section 8)
// ============================================================================

export const MODEL_TIERS: Record<StageComplexity, string[]> = {
  high:   ['claude-opus-4',   'claude-sonnet-4',   'ollama/llama3:70b'],
  medium: ['claude-sonnet-4', 'claude-haiku-4',    'ollama/llama3:70b'],
  low:    ['claude-haiku-4',  'ollama/llama3:8b',  'ollama/llama3:1b'],
};

export const STAGE_COMPLEXITY: Record<string, StageComplexity> = {
  SPECIFYING:    'medium',
  ARCHITECTING:  'high',
  BACKEND_GEN:   'high',
  FRONTEND_GEN:  'medium',
  QA_VALIDATION: 'medium',
  DEPLOYING:     'low',
};

// ============================================================================
// Failure Handling Types (Spec Section 12)
// ============================================================================

export enum FailureClass {
  TRANSIENT     = 'transient',
  MODEL_ERROR   = 'model_error',
  SCHEMA_ERROR  = 'schema_error',
  BUDGET        = 'budget',
  LOGIC         = 'logic',
  INFRA         = 'infra',
  UNRECOVERABLE = 'unrecoverable',
}

export interface FailurePolicy {
  max_retries: number;
  backoff: number[];
}

export const FAILURE_POLICY: Record<FailureClass, FailurePolicy> = {
  [FailureClass.TRANSIENT]:     { max_retries: 3, backoff: [2, 8, 30]  },
  [FailureClass.MODEL_ERROR]:   { max_retries: 2, backoff: [5, 15]     },
  [FailureClass.SCHEMA_ERROR]:  { max_retries: 2, backoff: [1, 5]      },
  [FailureClass.LOGIC]:         { max_retries: 2, backoff: [5, 30]     },
  [FailureClass.INFRA]:         { max_retries: 1, backoff: [60]        },
  [FailureClass.BUDGET]:        { max_retries: 0, backoff: []          },
  [FailureClass.UNRECOVERABLE]: { max_retries: 0, backoff: []          },
};

// ============================================================================
// Agent Response Types (Spec Section 4)
// ============================================================================

export interface CostEstimate {
  input_tokens: number;
  output_tokens: number;
  model: string;
  cost_usd: number;
}

export interface AgentResponse {
  status: 'ok' | 'needs_info' | 'blocked' | 'error';
  patch: Record<string, unknown>;
  cost_estimate: CostEstimate;
  warnings: string[];
  logs: Record<string, unknown>[];
}

// ============================================================================
// Project State (Spec Section 3)
// ============================================================================

export interface OrchestratorProjectMeta {
  id: string;
  version: number;
  schema_version: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  project_name: string;
  snapshot_key: string | null;
  rollback_history: string[];
}

export interface OrchestratorProjectStatus {
  stage: OrchestratorStage;
  stage_status: StageStatus;
  iteration: number;
  max_iterations: number;
  awaiting_approval: boolean;
  error: string | null;
  completed_stages: string[];
  celery_task_id: string | null;
}

export interface OrchestratorProjectInputs {
  raw_idea: string;
  constraints: string[];
  tech_preferences: Record<string, unknown>;
  target_users?: string;
  approval_required_stages: string[];
}

export interface OrchestratorProjectState {
  meta: OrchestratorProjectMeta;
  status: OrchestratorProjectStatus;
  inputs: OrchestratorProjectInputs;
  spec: Record<string, unknown> | null;
  architecture: Record<string, unknown> | null;
  backend: Record<string, unknown> | null;
  frontend: Record<string, unknown> | null;
  qa: Record<string, unknown> | null;
  infra: Record<string, unknown> | null;
  budget: BudgetState;
  logs: Record<string, unknown>[];
  history: Record<string, unknown>[];
}

// ============================================================================
// Orchestrator Config
// ============================================================================

export interface OrchestratorConfig {
  redis:    { url: string; keyPrefix: string };
  postgres: { url: string; maxConnections: number };
  s3:       { endpoint: string; bucket: string; region: string };
  ollama:   { nodes: string[]; enabled: boolean };
  cloud:    { anthropic: { apiKey: string; models: string[] } };
  budget:   { defaultLimit: number; thresholds: BudgetThresholds };
  pipeline: { maxIterations: number; stageTimeout: number };
}

// ============================================================================
// Orchestrator Errors
// ============================================================================

export class BudgetExhaustedError extends ManipulaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BUDGET_EXHAUSTED', details);
    this.name = 'BudgetExhaustedError';
  }
}

export class StageFrozenError extends ManipulaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'STAGE_FROZEN', details);
    this.name = 'StageFrozenError';
  }
}

export class PatchOwnershipViolationError extends ManipulaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PATCH_OWNERSHIP_VIOLATION', details);
    this.name = 'PatchOwnershipViolationError';
  }
}

export class InvalidTransitionError extends ManipulaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_TRANSITION', details);
    this.name = 'InvalidTransitionError';
  }
}

export class NoAvailableModelError extends ManipulaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NO_AVAILABLE_MODEL', details);
    this.name = 'NoAvailableModelError';
  }
}

export class OptimisticLockError extends ManipulaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'OPTIMISTIC_LOCK_CONFLICT', details);
    this.name = 'OptimisticLockError';
  }
}
