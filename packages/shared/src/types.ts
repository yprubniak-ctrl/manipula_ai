/**
 * ===========================================
 * MANIPULA PLATFORM - SHARED TYPES
 * ===========================================
 */

// ===========================================
// PROJECT STATE SCHEMA
// ===========================================

export interface ProjectState {
  version: number;
  projectId: string;
  phase: ProjectPhase;
  specification: SpecificationState | null;
  backend: BackendState | null;
  frontend: FrontendState | null;
  qa: QAState | null;
  deployment: DeploymentState | null;
  metadata: StateMetadata;
}

export enum ProjectPhase {
  INITIALIZING = 'initializing',
  SPECIFICATION = 'specification',
  BACKEND = 'backend',
  FRONTEND = 'frontend',
  QA = 'qa',
  DEPLOYMENT = 'deployment',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface StateMetadata {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  isValid: boolean;
  validationErrors?: string[];
}

// ===========================================
// SPECIFICATION STATE
// ===========================================

export interface SpecificationState {
  idea: string;
  productName: string;
  description: string;
  targetAudience: string[];
  coreFeatures: Feature[];
  technicalRequirements: TechnicalRequirements;
  constraints: ProjectConstraints;
  acceptanceCriteria: string[];
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  userStories: string[];
  technicalNotes?: string;
}

export interface TechnicalRequirements {
  stack: TechStack;
  authentication: boolean;
  database: DatabaseType;
  storage: boolean;
  externalAPIs: string[];
  scalabilityNeeds: 'low' | 'medium' | 'high';
}

export interface TechStack {
  backend: 'node' | 'python' | 'go' | 'java';
  frontend: 'react' | 'vue' | 'svelte' | 'next';
  framework?: string;
}

export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';

export interface ProjectConstraints {
  budget: 'low' | 'medium' | 'high';
  timeline: 'urgent' | 'normal' | 'flexible';
  complexity: 'simple' | 'moderate' | 'complex';
}

// ===========================================
// BACKEND STATE
// ===========================================

export interface BackendState {
  architecture: BackendArchitecture;
  api: APISpecification;
  database: DatabaseSchema;
  services: ServiceDefinition[];
  dependencies: Record<string, string>;
  environment: EnvironmentConfig;
}

export interface BackendArchitecture {
  pattern: 'monolith' | 'microservices' | 'serverless';
  language: string;
  framework: string;
  structure: FolderStructure;
}

export interface APISpecification {
  version: string;
  basePath: string;
  endpoints: APIEndpoint[];
  authentication: AuthConfig;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
  auth: boolean;
  requestSchema?: JSONSchema;
  responseSchema?: JSONSchema;
  errorCodes: number[];
}

export interface DatabaseSchema {
  type: DatabaseType;
  version: string;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  migrations: string[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string[];
  foreignKeys: ForeignKeyDefinition[];
  timestamps: boolean;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  unique: boolean;
  default?: string | number | boolean;
}

export interface ForeignKeyDefinition {
  column: string;
  references: {
    table: string;
    column: string;
  };
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}

export interface ServiceDefinition {
  name: string;
  description: string;
  methods: ServiceMethod[];
  dependencies: string[];
}

export interface ServiceMethod {
  name: string;
  parameters: Parameter[];
  returnType: string;
  async: boolean;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface AuthConfig {
  type: 'jwt' | 'oauth' | 'session' | 'apikey';
  providers?: string[];
  tokenExpiry?: string;
}

export interface EnvironmentConfig {
  requiredVars: string[];
  optionalVars: string[];
  secrets: string[];
}

// ===========================================
// FRONTEND STATE
// ===========================================

export interface FrontendState {
  architecture: FrontendArchitecture;
  pages: PageDefinition[];
  components: ComponentDefinition[];
  routing: RoutingConfig;
  styling: StylingConfig;
  stateManagement: StateManagementConfig;
}

export interface FrontendArchitecture {
  framework: string;
  buildTool: string;
  typescript: boolean;
  structure: FolderStructure;
}

export interface FolderStructure {
  [key: string]: string[] | FolderStructure;
}

export interface PageDefinition {
  name: string;
  path: string;
  components: string[];
  auth: boolean;
  layout?: string;
  meta: PageMeta;
}

export interface PageMeta {
  title: string;
  description?: string;
  keywords?: string[];
}

export interface ComponentDefinition {
  name: string;
  type: 'page' | 'layout' | 'ui' | 'feature';
  props: PropDefinition[];
  state?: string[];
  dependencies: string[];
  children?: string[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string;
}

export interface RoutingConfig {
  type: 'file-based' | 'declarative';
  routes: RouteDefinition[];
  guards?: string[];
}

export interface RouteDefinition {
  path: string;
  component: string;
  auth: boolean;
  meta?: Record<string, unknown>;
}

export interface StylingConfig {
  approach: 'css' | 'scss' | 'tailwind' | 'css-in-js' | 'styled-components';
  theme?: ThemeConfig;
}

export interface ThemeConfig {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  breakpoints: Record<string, string>;
}

export interface StateManagementConfig {
  library: 'redux' | 'zustand' | 'mobx' | 'recoil' | 'context' | 'none';
  stores?: StoreDefinition[];
}

export interface StoreDefinition {
  name: string;
  state: Record<string, string>;
  actions: string[];
}

// ===========================================
// QA STATE
// ===========================================

export interface QAState {
  testSuites: TestSuite[];
  coverage: CoverageReport;
  validationResults: ValidationResult[];
  securityScan: SecurityScanResult;
  performanceMetrics: PerformanceMetrics;
}

export interface TestSuite {
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  tests: TestCase[];
  status: TestStatus;
  duration: number;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  duration: number;
  error?: string;
  stackTrace?: string;
}

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending';

export interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface ValidationResult {
  validator: string;
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  location?: CodeLocation;
  severity: 'critical' | 'high' | 'medium';
}

export interface ValidationWarning {
  code: string;
  message: string;
  location?: CodeLocation;
}

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
}

export interface SecurityScanResult {
  vulnerabilities: Vulnerability[];
  score: number;
  passed: boolean;
}

export interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  package: string;
  version: string;
  title: string;
  description: string;
  fixedIn?: string;
}

export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errorRate: number;
}

// ===========================================
// DEPLOYMENT STATE
// ===========================================

export interface DeploymentState {
  provider: DeploymentProvider;
  status: DeploymentStatus;
  url?: string;
  environment: string;
  config: DeploymentConfig;
  buildLogs: string[];
  deploymentLogs: string[];
}

export type DeploymentProvider = 'vercel' | 'railway' | 'fly' | 'render' | 'aws' | 'gcp' | 'azure';

export type DeploymentStatus = 
  | 'pending'
  | 'building'
  | 'deploying'
  | 'active'
  | 'failed'
  | 'cancelled';

export interface DeploymentConfig {
  buildCommand?: string;
  startCommand?: string;
  environmentVars: Record<string, string>;
  domains?: string[];
  scaling?: ScalingConfig;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPU?: number;
  targetMemory?: number;
}

// ===========================================
// AGENT INTERFACES
// ===========================================

export interface AgentInput<T = unknown> {
  projectId: string;
  currentState: ProjectState;
  data: T;
  context?: AgentContext;
}

export interface AgentOutput<T = unknown> {
  success: boolean;
  patch: Partial<ProjectState> | null;
  data: T | null;
  errors?: AgentError[];
  warnings?: AgentWarning[];
  metadata: AgentMetadata;
}

export interface AgentContext {
  userId: string;
  constraints: ProjectConstraints;
  preferences?: Record<string, unknown>;
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
}

export interface AgentWarning {
  code: string;
  message: string;
}

export interface AgentMetadata {
  agentType: AgentType;
  executionId: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  tokensUsed?: number;
  costUsd?: number;
  model?: string;
}

export enum AgentType {
  IDEA = 'idea',
  BACKEND = 'backend',
  FRONTEND = 'frontend',
  QA = 'qa',
  DEVOPS = 'devops',
}

// ===========================================
// EXECUTION TRACKING
// ===========================================

export interface Execution {
  id: string;
  projectId: string;
  agentType: AgentType;
  status: ExecutionStatus;
  input: unknown;
  output: unknown | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
  retryCount: number;
  metadata: Record<string, unknown>;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry',
  CANCELLED = 'cancelled',
}

// ===========================================
// UTILITY TYPES
// ===========================================

export type JSONSchema = {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  [key: string]: unknown;
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
