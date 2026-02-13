# Manipula Platform - Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Principles](#core-principles)
3. [Architecture Layers](#architecture-layers)
4. [Component Details](#component-details)
5. [Data Flow](#data-flow)
6. [State Management](#state-management)
7. [Agent Architecture](#agent-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Security](#security)
10. [Scalability](#scalability)

---

## System Overview

Manipula is an agent-orchestrated AI platform built on a **deterministic state machine** architecture. Unlike traditional AI code generation tools that produce isolated outputs, Manipula coordinates multiple specialized agents through a shared, versioned state to build complete, deployable software systems.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                           │
│           (CLI, Web Dashboard, API Clients)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      API GATEWAY                            │
│         (REST API, Authentication, Rate Limiting)           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    ORCHESTRATOR                             │
│   ┌─────────────────────────────────────────────────┐      │
│   │            State Management Layer                │      │
│   │  (Project State, Versioning, Validation)        │      │
│   └─────────────────────┬───────────────────────────┘      │
│                         │                                    │
│   ┌─────────────────────▼───────────────────────────┐      │
│   │           Workflow Orchestration                 │      │
│   │  (Agent Routing, Retry Logic, Cost Tracking)    │      │
│   └─────────────────────┬───────────────────────────┘      │
└─────────────────────────┼────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│  IDEA AGENT    │ │   BACKEND  │ │   FRONTEND     │
│                │ │   AGENT    │ │    AGENT       │
└────────────────┘ └────────────┘ └────────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                  ┌───────▼────────┐
                  │   QA AGENT     │
                  └───────┬────────┘
                          │
                  ┌───────▼────────┐
                  │ DEVOPS AGENT   │
                  └────────────────┘
```

---

## Core Principles

### 1. Structured State Over Text

All project information is stored as **typed, versioned JSON schemas** rather than freeform text. This enables:

- Deterministic agent behavior
- Easy validation and error detection
- State rollback and version control
- Clear interfaces between agents

### 2. Deterministic Agent Interfaces

Each agent follows a strict contract:

```typescript
interface AgentInterface {
  input: ProjectState;
  execute(): Promise<AgentOutput>;
  output: {
    patch: Partial<ProjectState>;
    metadata: ExecutionMetadata;
  };
}
```

### 3. Feedback Loops

Agents can iterate with validation:

```
Dev Agent → Output → QA Agent → Validation
     ↑                              │
     └──────── Feedback ────────────┘
```

### 4. Hybrid Model Routing

Intelligent routing between models based on:
- Task complexity
- Cost constraints
- Latency requirements
- Quality needs

### 5. Versioning and Rollback

Every state change is versioned:
- Atomic updates
- Point-in-time recovery
- Diff visualization
- Audit trail

---

## Architecture Layers

### Layer 1: Presentation

**Responsibilities**: User interaction, visualization

**Components**:
- Web Dashboard (Next.js)
- CLI Tool
- REST API clients
- Mobile apps (future)

**Technologies**: React, Next.js, TypeScript, Tailwind CSS

### Layer 2: API Gateway

**Responsibilities**: Request handling, authentication, rate limiting

**Components**:
- Express.js API server
- Authentication middleware
- Request validation
- Rate limiting
- CORS handling

**Technologies**: Express, Passport.js, express-rate-limit

### Layer 3: Orchestration

**Responsibilities**: State management, workflow control

**Components**:
- State Manager
- Workflow Engine
- Agent Router
- Retry Handler
- Cost Tracker

**Technologies**: TypeScript, BullMQ, Redis

### Layer 4: Agents

**Responsibilities**: Specialized AI tasks

**Components**:
- Idea/Spec Agent
- Backend Agent
- Frontend Agent
- QA Agent
- DevOps Agent

**Technologies**: LangChain, OpenAI SDK, Anthropic SDK

### Layer 5: Data

**Responsibilities**: Persistent storage

**Components**:
- PostgreSQL (primary data)
- Redis (cache, queue)
- S3 (artifacts)
- Vector DB (embeddings)

**Technologies**: Prisma ORM, PostgreSQL 16, Redis 7

---

## Component Details

### Orchestrator

The orchestrator is the brain of the system.

**Key Responsibilities**:

1. **State Management**
   - Maintains the global project state
   - Handles state versioning
   - Validates state transitions
   - Manages rollbacks

2. **Agent Coordination**
   - Determines agent execution order
   - Routes tasks to appropriate agents
   - Manages parallel execution
   - Handles inter-agent communication

3. **Retry Logic**
   - Detects failures
   - Implements exponential backoff
   - Manages retry budgets
   - Learns from failures

4. **Cost Management**
   - Tracks token usage
   - Monitors costs per project
   - Implements cost limits
   - Optimizes model selection

**State Machine**:

```typescript
enum ProjectPhase {
  INITIALIZING,
  SPECIFICATION,
  BACKEND,
  FRONTEND,
  QA,
  DEPLOYMENT,
  COMPLETED,
  FAILED
}

const transitions = {
  INITIALIZING: [SPECIFICATION, FAILED],
  SPECIFICATION: [BACKEND, INITIALIZING, FAILED],
  BACKEND: [FRONTEND, SPECIFICATION, FAILED],
  FRONTEND: [QA, BACKEND, FAILED],
  QA: [DEPLOYMENT, BACKEND, FRONTEND, FAILED],
  DEPLOYMENT: [COMPLETED, FAILED],
  COMPLETED: [],
  FAILED: [INITIALIZING]
};
```

### Agents

Each agent is an independent worker that:

1. Reads current project state
2. Executes specialized task
3. Produces a state patch
4. Returns metadata

**Agent Structure**:

```
agent/
├── src/
│   ├── core/
│   │   ├── agent.ts          # Main agent class
│   │   └── executor.ts       # LLM execution
│   ├── prompts/
│   │   ├── system.ts         # System prompts
│   │   └── templates.ts      # Prompt templates
│   ├── validators/
│   │   └── output.ts         # Output validation
│   └── utils/
│       └── helpers.ts        # Utility functions
├── tests/
└── package.json
```

---

## Data Flow

### Project Creation Flow

```
1. User submits idea via CLI/API
   │
   ▼
2. API validates input, creates project record
   │
   ▼
3. Orchestrator initializes project state
   │
   ▼
4. Idea Agent generates specification
   │
   ▼
5. State updated with specification
   │
   ▼
6. Backend Agent generates backend
   │
   ▼
7. Frontend Agent generates frontend
   │
   ▼
8. QA Agent validates output
   │
   ├─► (Pass) → Deploy Agent
   │
   └─► (Fail) → Retry (Backend/Frontend)
   │
   ▼
9. Deploy Agent publishes project
   │
   ▼
10. User receives live URL
```

### State Update Flow

```
1. Agent produces output
   │
   ▼
2. Orchestrator validates patch
   │
   ├─► (Valid) → Apply patch
   │            │
   │            ▼
   │         Create new state version
   │            │
   │            ▼
   │         Persist to database
   │            │
   │            ▼
   │         Trigger next agent
   │
   └─► (Invalid) → Reject, log error
                   │
                   ▼
                Retry or fail
```

---

## State Management

### State Schema

```typescript
interface ProjectState {
  version: number;
  projectId: string;
  phase: ProjectPhase;
  
  // Agent outputs
  specification: SpecificationState | null;
  backend: BackendState | null;
  frontend: FrontendState | null;
  qa: QAState | null;
  deployment: DeploymentState | null;
  
  // Metadata
  metadata: StateMetadata;
}
```

### State Versioning

States are immutable and versioned:

```
v1: Initial state (empty)
v2: + Specification
v3: + Backend schema
v4: + Frontend components
v5: + QA results (failed)
v6: + Backend fixes (retry)
v7: + QA results (passed)
v8: + Deployment config
```

### State Patches

Agents produce **patches**, not full states:

```typescript
// Agent output
{
  patch: {
    backend: {
      api: {
        endpoints: [
          { path: '/users', method: 'GET', ... }
        ]
      }
    }
  }
}

// Applied via deep merge
newState = deepMerge(currentState, patch);
```

---

## Agent Architecture

### Agent Lifecycle

```
1. Receive Input
   ├─ Project State
   ├─ Task Parameters
   └─ Context

2. Validate Input
   ├─ Check prerequisites
   ├─ Verify state consistency
   └─ Validate constraints

3. Execute Task
   ├─ Build prompt
   ├─ Call LLM
   ├─ Parse response
   └─ Validate output

4. Produce Output
   ├─ Generate state patch
   ├─ Collect metadata
   └─ Handle errors

5. Return Result
```

### Example: Backend Agent

```typescript
class BackendAgent implements Agent {
  async execute(input: AgentInput): Promise<AgentOutput> {
    // 1. Extract specification
    const spec = input.currentState.specification;
    
    // 2. Build prompt
    const prompt = this.buildPrompt(spec);
    
    // 3. Call LLM
    const response = await this.llm.complete(prompt);
    
    // 4. Parse and validate
    const backend = this.parseBackend(response);
    await this.validate(backend);
    
    // 5. Create patch
    const patch = { backend };
    
    // 6. Return result
    return {
      success: true,
      patch,
      metadata: this.getMetadata()
    };
  }
}
```

---

## Deployment Architecture

### Production Stack

```
┌──────────────────────────────────────────┐
│            Load Balancer                 │
│        (AWS ALB / Nginx)                 │
└──────────────────┬───────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
┌───▼────┐                   ┌────▼───┐
│  API   │                   │  API   │
│ (Pod)  │                   │ (Pod)  │
└────────┘                   └────────┘
    │                             │
    └──────────────┬──────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼────┐         ┌────▼────┐
    │Postgres │         │  Redis  │
    └─────────┘         └─────────┘
```

### Kubernetes Deployment

- **API**: 3+ replicas, HPA enabled
- **Orchestrator**: 2 replicas
- **Agent Workers**: Auto-scaled (1-10)
- **PostgreSQL**: StatefulSet with replication
- **Redis**: Redis Cluster

### High Availability

- Multi-AZ deployment
- Database replication
- Redis clustering
- Automated failover
- Health checks
- Circuit breakers

---

## Security

### Authentication

- JWT tokens
- API keys
- OAuth 2.0 (future)

### Authorization

- Role-based access control (RBAC)
- Project-level permissions
- API rate limiting

### Data Security

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Secrets management (AWS Secrets Manager)
- Regular security audits

### Input Validation

- Schema validation (Zod)
- Sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection

---

## Scalability

### Horizontal Scaling

- **API**: Stateless, scales with load
- **Orchestrator**: Multiple instances with leader election
- **Agents**: Auto-scaled worker pools
- **Database**: Read replicas

### Vertical Scaling

- **Database**: Larger instances for high throughput
- **Cache**: Increased Redis memory
- **Agents**: GPU instances for local models

### Performance Optimizations

- Response caching
- Database indexing
- Connection pooling
- Lazy loading
- Pagination
- Debouncing

### Cost Optimizations

- Model routing (cheap vs. expensive)
- Caching LLM responses
- Batch processing
- Spot instances for agents
- Auto-scaling policies

---

## Monitoring & Observability

### Metrics

- Request rate, latency, errors
- Agent execution time
- Token usage and cost
- Queue depth
- Database performance

### Logging

- Structured logging (JSON)
- Log aggregation (ELK Stack)
- Distributed tracing (Jaeger)

### Alerting

- Prometheus + Alertmanager
- PagerDuty integration
- Slack notifications

---

## Future Enhancements

1. **Multi-region deployment**
2. **Event-driven architecture**
3. **GraphQL API**
4. **Real-time collaboration**
5. **Advanced caching strategies**
6. **Machine learning for optimization**

---

**Last Updated**: December 2024
