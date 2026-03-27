# Manipula Platform - Project Structure

> **Status note (March 27, 2026):** This document describes the target/full platform layout. The currently validated MVP in this branch is centered on `packages/orchestrator` with supporting shared packages.

## Repository Overview

```
manipula-platform/
├── .github/                    # GitHub-specific files
│   └── workflows/              # CI/CD workflows
│       ├── ci.yml             # Continuous Integration
│       └── deploy.yml         # Deployment pipeline
│
├── apps/                       # Application services (monorepo)
│   ├── orchestrator/          # Core orchestration service
│   │   ├── src/
│   │   │   └── index.ts       # Main orchestrator logic
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── api/                   # REST/GraphQL API gateway
│   │   ├── src/
│   │   │   ├── index.ts       # API server setup
│   │   │   ├── routes/        # API route definitions
│   │   │   ├── controllers/   # Request handlers
│   │   │   └── middleware/    # Auth, validation, etc.
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                   # Next.js web dashboard
│   │   ├── src/
│   │   │   ├── app/           # Next.js app router
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # Utilities
│   │   │   └── styles/        # Global styles
│   │   ├── public/            # Static assets
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── agents-runtime/        # Agent execution runtime
│       ├── src/
│       │   ├── index.ts       # Runtime server
│       │   ├── executor.ts    # Agent executor
│       │   └── sandbox.ts     # Sandboxing logic
│       ├── Dockerfile
│       └── package.json
│
├── agents/                     # Individual AI agents
│   ├── idea-spec/             # Specification generation
│   │   ├── src/
│   │   │   └── index.ts       # Agent implementation
│   │   ├── __tests__/         # Agent tests
│   │   └── package.json
│   │
│   ├── backend-gen/           # Backend code generation
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── templates/     # Code templates
│   │   │   └── generators/    # Code generators
│   │   └── package.json
│   │
│   ├── frontend-gen/          # Frontend code generation
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── templates/
│   │   │   └── generators/
│   │   └── package.json
│   │
│   ├── qa-validation/         # Quality assurance
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── validators/    # Code validators
│   │   │   └── scanners/      # Security scanners
│   │   └── package.json
│   │
│   └── devops/                # Deployment automation
│       ├── src/
│       │   ├── index.ts
│       │   ├── deployers/     # Platform deployers
│       │   └── templates/     # IaC templates
│       └── package.json
│
├── packages/                   # Shared packages
│   ├── shared/                # Common types and utilities
│   │   ├── src/
│   │   │   └── index.ts       # Core types, errors
│   │   └── package.json
│   │
│   ├── state-manager/         # State management library
│   │   ├── src/
│   │   │   └── index.ts       # State operations
│   │   └── package.json
│   │
│   ├── agent-sdk/             # Agent development SDK
│   │   ├── src/
│   │   │   └── index.ts       # Base agent classes
│   │   └── package.json
│   │
│   └── ui-components/         # Shared React components
│       ├── src/
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   └── index.ts
│       └── package.json
│
├── infrastructure/             # Infrastructure as Code
│   ├── docker/                # Docker configurations
│   │   ├── postgres/
│   │   │   └── init.sql       # Database schema
│   │   └── redis/
│   │       └── redis.conf     # Redis configuration
│   │
│   ├── kubernetes/            # Kubernetes manifests
│   │   ├── base/              # Base configurations
│   │   ├── staging/           # Staging overlays
│   │   └── production/        # Production overlays
│   │
│   ├── terraform/             # Terraform IaC
│   │   ├── modules/           # Reusable modules
│   │   ├── staging/           # Staging environment
│   │   └── production/        # Production environment
│   │
│   └── scripts/               # Utility scripts
│       ├── setup-dev.sh       # Development setup
│       ├── deploy-staging.sh  # Staging deployment
│       └── deploy-prod.sh     # Production deployment
│
├── docs/                       # Documentation
│   ├── architecture.md        # System architecture
│   ├── api-reference.md       # API documentation
│   ├── agent-development.md   # Agent dev guide
│   ├── state-management.md    # State system docs
│   ├── deployment.md          # Deployment guide
│   └── contributing.md        # Contribution guidelines
│
├── tests/                      # Tests
│   ├── integration/           # Integration tests
│   │   ├── orchestrator.test.ts
│   │   ├── agents.test.ts
│   │   └── api.test.ts
│   │
│   └── e2e/                   # End-to-end tests
│       ├── project-lifecycle.test.ts
│       └── web-dashboard.test.ts
│
├── config/                     # Configuration files
│   ├── jest.config.js         # Jest configuration
│   └── tsconfig.base.json     # Base TypeScript config
│
├── .github/                    # GitHub configuration
├── .gitignore                 # Git ignore rules
├── .prettierrc                # Prettier configuration
├── .eslintrc.json             # ESLint configuration
├── docker-compose.yml         # Docker Compose setup
├── turbo.json                 # Turborepo configuration
├── pnpm-workspace.yaml        # pnpm workspace config
├── package.json               # Root package.json
├── tsconfig.json              # Root TypeScript config
├── .env.example               # Environment variables template
├── README.md                  # Project README
├── LICENSE                    # MIT License
└── CHANGELOG.md               # Version changelog
```

## Directory Purposes

### `/apps`
Contains all deployable applications. Each app is independent but shares packages.

- **orchestrator**: Manages project lifecycle and coordinates agents
- **api**: Public API for client interactions
- **web**: User interface for project management
- **agents-runtime**: Executes AI agents in isolated environment

### `/agents`
Individual AI agents, each responsible for a specific phase of development.

Each agent:
- Extends `BaseAgent` from `@manipula/agent-sdk`
- Follows input → process → output pattern
- Returns state patches and artifacts
- Is independently testable

### `/packages`
Shared libraries used across apps and agents.

- **shared**: Core types, schemas, utilities
- **state-manager**: Project state management with versioning
- **agent-sdk**: Base classes and utilities for agent development
- **ui-components**: Reusable React components for web apps

### `/infrastructure`
All infrastructure and deployment configurations.

- **docker**: Container configurations and scripts
- **kubernetes**: K8s manifests for different environments
- **terraform**: Infrastructure as Code for cloud resources
- **scripts**: Deployment and utility scripts

### `/docs`
Comprehensive documentation for developers and users.

### `/tests`
Shared integration and end-to-end tests.

## Key Files

| File | Purpose |
|------|---------|
| `package.json` | Root dependencies and scripts |
| `turbo.json` | Monorepo build configuration |
| `docker-compose.yml` | Local development environment |
| `.env.example` | Environment variables template |
| `tsconfig.json` | TypeScript configuration |
| `.prettierrc` | Code formatting rules |
| `.eslintrc.json` | Linting rules |

## Workspace Dependencies

```
┌─────────────────┐
│  apps/web       │──┐
└─────────────────┘  │
                     │
┌─────────────────┐  │
│  apps/api       │──┼──> packages/shared
└─────────────────┘  │
                     │
┌─────────────────┐  │
│apps/orchestrator│──┘
└─────────────────┘
         │
         ├──> packages/state-manager
         └──> packages/agent-sdk
                     │
                     └──> packages/shared

┌─────────────────┐
│agents/*         │──> packages/agent-sdk
└─────────────────┘          │
                             └──> packages/shared
```

## Build Order

Turborepo automatically determines build order based on dependencies:

1. `packages/shared`
2. `packages/state-manager`, `packages/agent-sdk` (parallel)
3. `packages/ui-components`
4. `apps/*`, `agents/*` (parallel)

## Development Workflow

```bash
# Install all dependencies
pnpm install

# Build all packages and apps
pnpm build

# Start development servers
pnpm dev
# Runs all apps in dev mode concurrently

# Run tests
pnpm test                 # All unit tests
pnpm test:integration     # Integration tests
pnpm test:e2e            # End-to-end tests

# Lint and format
pnpm lint                # Run linter
pnpm format              # Format code

# Docker
pnpm docker:build        # Build containers
pnpm docker:up          # Start containers
pnpm docker:down        # Stop containers
```

## Adding New Components

### New Agent
```bash
# 1. Create agent directory
mkdir -p agents/new-agent/{src,__tests__}

# 2. Add package.json
# 3. Implement agent extending BaseAgent
# 4. Add tests
# 5. Update orchestrator phase transitions
```

### New Package
```bash
# 1. Create package directory
mkdir -p packages/new-package/src

# 2. Add package.json with workspace:* dependencies
# 3. Implement package
# 4. Update dependent packages
```

### New App
```bash
# 1. Create app directory
mkdir -p apps/new-app/src

# 2. Add package.json
# 3. Implement app
# 4. Add Dockerfile
# 5. Update docker-compose.yml
```

## Environment Variables

Each service requires specific environment variables. See `.env.example` for complete list.

### Required for Development
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Service-Specific
- **API**: JWT_SECRET, CORS_ORIGIN
- **Orchestrator**: MAX_CONCURRENT_AGENTS, COST_LIMIT_USD
- **Web**: NEXT_PUBLIC_API_URL

## Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| Web | 3001 | Next.js dashboard |
| API | 3000 | REST API |
| Orchestrator | 4000 | Internal service |
| Agents Runtime | 5000 | Agent execution |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & Queue |
| PgAdmin | 5050 | DB management (optional) |
| Redis Commander | 8081 | Redis management (optional) |

## Data Flow Example

```
User Request (Web)
    ↓
API Gateway (:3000)
    ↓
Orchestrator (:4000)
    ↓
Bull Queue (Redis :6379)
    ↓
Agents Runtime (:5000)
    ↓
AI Agent (idea-spec, backend-gen, etc.)
    ↓
State Manager
    ↓
PostgreSQL (:5432)
```

## Useful Commands

```bash
# View logs
docker-compose logs -f [service]

# Rebuild specific service
docker-compose up -d --build [service]

# Run database migrations
pnpm --filter @manipula/api db:migrate

# Access database
docker-compose exec postgres psql -U manipula

# Access Redis CLI
docker-compose exec redis redis-cli

# Run agent tests
pnpm --filter "@manipula/agent-*" test

# Build specific package
pnpm --filter @manipula/shared build

# Clean and rebuild
pnpm clean && pnpm install && pnpm build
```
