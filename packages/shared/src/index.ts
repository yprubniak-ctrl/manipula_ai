import { z } from 'zod';
import { nanoid } from 'nanoid';

// ============================================================================
// Base Types
// ============================================================================

export enum AgentType {
  IDEA_SPEC = 'idea-spec',
  BACKEND_GEN = 'backend-gen',
  FRONTEND_GEN = 'frontend-gen',
  QA_VALIDATION = 'qa-validation',
  DEVOPS = 'devops',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum ProjectPhase {
  SPECIFICATION = 'specification',
  BACKEND_DEVELOPMENT = 'backend_development',
  FRONTEND_DEVELOPMENT = 'frontend_development',
  QA_TESTING = 'qa_testing',
  DEPLOYMENT = 'deployment',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ProjectRequirementsSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  requirements: z.array(z.string()).min(1),
  tech_stack: z
    .object({
      backend: z.array(z.string()).optional(),
      frontend: z.array(z.string()).optional(),
      database: z.string().optional(),
      deployment: z.string().optional(),
    })
    .optional(),
  constraints: z
    .object({
      budget_usd: z.number().optional(),
      timeline_days: z.number().optional(),
      team_size: z.number().optional(),
    })
    .optional(),
});

export const AgentExecutionSchema = z.object({
  id: z.string(),
  agent_type: z.nativeEnum(AgentType),
  status: z.nativeEnum(ExecutionStatus),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  started_at: z.date(),
  completed_at: z.date().optional(),
  retries: z.number().default(0),
  cost_usd: z.number().default(0),
});

export const ProjectStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: z.nativeEnum(ProjectPhase),
  version: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
  specification: z.record(z.any()).optional(),
  backend: z.record(z.any()).optional(),
  frontend: z.record(z.any()).optional(),
  qa_results: z.record(z.any()).optional(),
  deployment: z.record(z.any()).optional(),
  executions: z.array(AgentExecutionSchema),
  metadata: z.record(z.any()),
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type ProjectRequirements = z.infer<typeof ProjectRequirementsSchema>;
export type AgentExecution = z.infer<typeof AgentExecutionSchema>;
export type ProjectState = z.infer<typeof ProjectStateSchema>;

// ============================================================================
// Agent Interface
// ============================================================================

export interface AgentInput {
  project_id: string;
  state: ProjectState;
  config: Record<string, any>;
}

export interface AgentOutput {
  status: ExecutionStatus;
  patches: StatePatch[];
  artifacts?: Artifact[];
  error?: string;
  cost_usd?: number;
}

export interface StatePatch {
  path: string; // JSON path notation (e.g., "backend.api.endpoints")
  operation: 'set' | 'merge' | 'delete' | 'push';
  value: any;
}

export interface Artifact {
  id: string;
  type: 'file' | 'directory' | 'url';
  path: string;
  content?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(prefix?: string): string {
  const id = nanoid(16);
  return prefix ? `${prefix}_${id}` : id;
}

export function createProjectState(requirements: ProjectRequirements): ProjectState {
  return {
    id: generateId('proj'),
    name: requirements.name,
    phase: ProjectPhase.SPECIFICATION,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
    executions: [],
    metadata: {
      requirements,
    },
  };
}

export function createAgentExecution(
  agentType: AgentType,
  input: Record<string, any>
): AgentExecution {
  return {
    id: generateId('exec'),
    agent_type: agentType,
    status: ExecutionStatus.PENDING,
    input,
    started_at: new Date(),
    retries: 0,
    cost_usd: 0,
  };
}

// ============================================================================
// Error Classes
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

export class StateValidationError extends ManipulaError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'STATE_VALIDATION_ERROR', details);
    this.name = 'StateValidationError';
  }
}

export class CostLimitExceededError extends ManipulaError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'COST_LIMIT_EXCEEDED', details);
    this.name = 'CostLimitExceededError';
  }
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT_SECONDS: 300,
  COST_LIMIT_USD: 50,
  MAX_ITERATIONS: 10,
} as const;

export const AGENT_PRIORITIES = {
  [AgentType.IDEA_SPEC]: 1,
  [AgentType.BACKEND_GEN]: 2,
  [AgentType.FRONTEND_GEN]: 3,
  [AgentType.QA_VALIDATION]: 4,
  [AgentType.DEVOPS]: 5,
} as const;

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
// Enhanced ProjectState for Orchestrator (Spec Section 3)
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
