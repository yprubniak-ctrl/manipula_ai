import { z } from 'zod';
import { nanoid } from 'nanoid';

// ============================================================================
// Base Types
// ============================================================================

export enum AgentType {
  PRODUCT = 'product',
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
  [AgentType.PRODUCT]: 1,
  [AgentType.IDEA_SPEC]: 1,
  [AgentType.BACKEND_GEN]: 2,
  [AgentType.FRONTEND_GEN]: 3,
  [AgentType.QA_VALIDATION]: 4,
  [AgentType.DEVOPS]: 5,
} as const;
