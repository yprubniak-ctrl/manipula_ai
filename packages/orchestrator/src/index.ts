/**
 * @manipula/orchestrator-engine
 *
 * Production-ready agentic orchestration engine for the Manipula platform.
 */

// Engine
export { Orchestrator, NoOpLock } from './engine/orchestrator';
export type { OrchestratorOptions, StateStore, DistributedLock } from './engine/orchestrator';
export { StateMachine } from './engine/state-machine';
export { StageExecutor } from './engine/stage-executor';
export type { StageExecutorConfig } from './engine/stage-executor';
export { PIPELINE, VALID_TRANSITIONS, findStageSpec, getPipelineOrder, requiresApproval } from './engine/pipeline';

// Budget
export { BudgetController } from './budget/controller';
export { calculateCost, estimatePreAuthCost, MODEL_COSTS_PER_TOKEN } from './budget/costs';

// Routing
export { ModelRouter, CloudLLMClient, LocalLLMClient } from './routing/model-router';
export type { ModelRouterConfig } from './routing/model-router';
export { LocalNode } from './routing/health-checker';

// Validation
export { SchemaValidator, STAGE_SCHEMAS } from './validation/schema-validator';
export { PatchValidator } from './validation/patch-validator';

// Snapshot
export { SnapshotManager } from './snapshot/manager';
export type { S3Client, SnapshotManagerConfig } from './snapshot/manager';
export { RollbackHandler } from './snapshot/rollback';

// Agents
export { BaseAgent } from './agents/base-agent';
export { AgentRegistry, agentRegistry } from './agents/registry';
export type { AgentFactory } from './agents/registry';

// QA
export { QAFeedbackLoop } from './qa/feedback-loop';
export { IssueRouter } from './qa/issue-router';
export type { QAIssue, IssueSeverity, IssueTarget } from './qa/issue-router';

// Observability
export { Logger, logger } from './observability/logger';
export type { LogLevel, LogEntry, LoggerContext } from './observability/logger';
export {
  Counter, Gauge, Histogram,
  stageDurationSeconds, tokensTotal, budgetUtilizationRatio,
  qaIterationsCount, modelSelectionsTotal, stagesTotal,
} from './observability/metrics';

// Re-export shared orchestrator types
export {
  VALID_TRANSITIONS as VALID_STAGE_TRANSITIONS,
  STAGE_OWNERSHIP,
  PIPELINE as STAGE_PIPELINE,
  MODEL_TIERS,
  STAGE_COMPLEXITY,
  DEFAULT_BUDGET_THRESHOLDS,
  NON_CORE_STAGES,
  FAILURE_POLICY,
  FailureClass,
  BudgetExhaustedError,
  StageFrozenError,
  PatchOwnershipViolationError,
  InvalidTransitionError,
  NoAvailableModelError,
  OptimisticLockError,
} from '@manipula/shared';

export type {
  OrchestratorProjectState,
  OrchestratorProjectMeta,
  OrchestratorProjectStatus,
  OrchestratorProjectInputs,
  OrchestratorStage,
  StageStatus,
  StageSpec,
  StageComplexity,
  BudgetState,
  BudgetThresholds,
  CostEstimate,
  AgentResponse,
  OrchestratorConfig,
  FailurePolicy,
} from '@manipula/shared';
