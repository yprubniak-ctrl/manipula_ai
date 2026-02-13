# Manipula — Agentic AI Platform for End-to-End Software Development

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

Manipula is an agent-orchestrated AI platform designed to automate the full software development lifecycle — from idea to live deployment. Instead of generating isolated outputs, Manipula coordinates specialized AI agents through a structured global state and deterministic pipeline.

## 🎯 Vision

To become the smallest self-sufficient digital product unit — inspired by the Roman "manipula" — where a compact, orchestrated system can independently build and ship software at startup speed.

## ✨ Features

### Core Capabilities
- **Structured Specification** - Transform ideas into detailed PRDs
- **Backend Architecture** - Generate APIs, database schemas, and business logic
- **Frontend Components** - Build UI components and application logic
- **Automated QA** - Validate code quality, security, and functionality
- **Deployment Pipeline** - Deploy to production with CI/CD automation

### Technical Highlights
- 🔄 **State-Driven Architecture** - Versioned JSON state with rollback support
- 🤖 **Multi-Agent Orchestration** - Coordinated AI agents with feedback loops
- 🎯 **Deterministic Pipelines** - Predictable input → patch → status flow
- 💰 **Cost Optimization** - Hybrid model routing (local + cloud)
- 🔒 **Production Ready** - CI/CD, testing, and monitoring built-in

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                         │
│  (State Management + Agent Coordination)                │
└─────────────────┬───────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┬──────────┐
    ▼             ▼             ▼             ▼          ▼
┌────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐
│ Idea/  │  │ Backend  │  │ Frontend │  │   QA   │  │ DevOps │
│  Spec  │  │   Gen    │  │   Gen    │  │  Val   │  │  Agent │
│ Agent  │  │  Agent   │  │  Agent   │  │ Agent  │  │        │
└────────┘  └──────────┘  └──────────┘  └────────┘  └────────┘
     │            │             │             │           │
     └────────────┴─────────────┴─────────────┴───────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   Global State Store   │
              │  (Versioned + Audited) │
              └────────────────────────┘
```

## 📦 Monorepo Structure

```
manipula-platform/
├── apps/
│   ├── orchestrator/      # Main orchestration service
│   ├── api/               # REST/GraphQL API gateway
│   ├── web/               # Next.js dashboard
│   └── agents-runtime/    # Agent execution runtime
├── agents/
│   ├── idea-spec/         # Specification generation
│   ├── backend-gen/       # Backend code generation
│   ├── frontend-gen/      # Frontend code generation
│   ├── qa-validation/     # Quality assurance
│   └── devops/            # Deployment automation
├── packages/
│   ├── shared/            # Shared utilities
│   ├── state-manager/     # State management library
│   ├── agent-sdk/         # Agent development SDK
│   └── ui-components/     # Shared React components
├── infrastructure/
│   ├── docker/            # Docker configurations
│   ├── kubernetes/        # K8s manifests
│   ├── terraform/         # Infrastructure as Code
│   └── scripts/           # Deployment scripts
├── docs/                  # Documentation
└── tests/                 # Integration & E2E tests
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/manipula-platform.git
cd manipula-platform

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run setup script
pnpm run setup

# Start development servers
pnpm run dev
```

### Docker Setup

```bash
# Build all containers
pnpm run docker:build

# Start services
pnpm run docker:up

# View logs
docker-compose logs -f

# Stop services
pnpm run docker:down
```

## 🎯 Usage

### 1. Create a New Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My SaaS App",
    "description": "A project management tool for remote teams",
    "requirements": ["user auth", "real-time collaboration", "payment integration"]
  }'
```

### 2. Monitor Progress

```bash
# Get project status
curl http://localhost:3000/api/projects/{projectId}/status

# Get agent execution logs
curl http://localhost:3000/api/projects/{projectId}/logs
```

### 3. Access Generated Code

```bash
# Download project artifacts
curl http://localhost:3000/api/projects/{projectId}/artifacts -o project.zip
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run agent-specific tests
pnpm run agents:test

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Generate coverage report
pnpm test:coverage
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [Agent Development Guide](./docs/agent-development.md)
- [State Management](./docs/state-management.md)
- [API Reference](./docs/api-reference.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guidelines](./docs/contributing.md)

## 🔧 Configuration

### Environment Variables

```env
# API Configuration
API_PORT=3000
API_HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/manipula
REDIS_URL=redis://localhost:6379

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LOCAL_MODEL_ENDPOINT=http://localhost:8080

# Execution Limits
MAX_EXECUTION_TIME=3600
MAX_ITERATIONS=10
COST_LIMIT_USD=50

# Deployment
DEPLOY_TARGET=production
DEPLOY_PROVIDER=vercel
```

## 🛣️ Roadmap

### MVP (v0.1) - Current
- [x] Core orchestrator
- [x] 4 base agents (Spec, Backend, Frontend, QA)
- [x] State management system
- [x] Basic web dashboard
- [ ] Production deployment

### v0.2
- [ ] DevOps agent integration
- [ ] Multi-model support
- [ ] Cost optimization engine
- [ ] Rollback and versioning UI

### v0.3
- [ ] Plugin system for custom agents
- [ ] Collaborative features
- [ ] Advanced analytics
- [ ] Enterprise features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./docs/contributing.md) for details.

```bash
# Fork the repository
# Create a feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add amazing feature'

# Push to the branch
git push origin feature/amazing-feature

# Open a Pull Request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Roman military organization principles
- Built with modern AI orchestration patterns
- Powered by the open-source community

## 📞 Support

- Documentation: [docs.manipula.dev](https://docs.manipula.dev)
- Discord: [discord.gg/manipula](https://discord.gg/manipula)
- Email: support@manipula.dev
- Twitter: [@manipula_ai](https://twitter.com/manipula_ai)

---

Built with ❤️ by the Manipula team
