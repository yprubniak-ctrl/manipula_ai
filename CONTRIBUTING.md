# Contributing to Manipula

Thank you for your interest in contributing to Manipula! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ or Python 3.11+
- Docker & Docker Compose
- Git
- PostgreSQL 16+ (for local development)
- Redis 7+ (for local development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/manipula-platform.git
cd manipula-platform
```

3. Add the upstream remote:
```bash
git remote add upstream https://github.com/manipula/manipula-platform.git
```

## 💻 Development Setup

### Using Docker (Recommended)

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Local Development

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate:dev

# Seed database
npm run seed

# Start development servers
npm run dev
```

This will start:
- API server on `http://localhost:3000`
- Web dashboard on `http://localhost:3001`
- Orchestrator service

## 📁 Project Structure

```
manipula-platform/
├── agents/                  # AI agent implementations
│   ├── idea-agent/         # Specification generation
│   ├── backend-agent/      # Backend code generation
│   ├── frontend-agent/     # Frontend code generation
│   └── qa-agent/           # Testing & validation
├── orchestrator/           # Core orchestration logic
│   ├── core/              # State management
│   ├── models/            # LLM routing
│   └── queue/             # Job queue
├── api/                    # REST API server
│   ├── routes/            # API endpoints
│   ├── middleware/        # Express middleware
│   └── controllers/       # Request handlers
├── cli/                    # Command-line interface
├── web/                    # Web dashboard (Next.js)
├── packages/               # Shared packages
│   └── shared/            # Shared types and utilities
├── infrastructure/         # IaC and deployment
│   ├── terraform/         # Infrastructure as Code
│   ├── kubernetes/        # K8s manifests
│   └── docker/            # Dockerfiles
├── tests/                  # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/                   # Documentation
```

## 🔄 Development Workflow

### 1. Create a Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding standards
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and focused

### 3. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(agents): add retry logic to backend agent"
git commit -m "fix(api): resolve project state update race condition"
git commit -m "docs: update API documentation"
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📝 Coding Standards

### TypeScript/JavaScript

```typescript
// Use TypeScript for type safety
export interface ProjectConfig {
  id: string;
  name: string;
  constraints: ProjectConstraints;
}

// Use async/await over promises
async function createProject(config: ProjectConfig): Promise<Project> {
  const project = await db.project.create({ data: config });
  return project;
}

// Use meaningful variable names
const activeProjects = await getActiveProjects();

// Add JSDoc comments for public APIs
/**
 * Creates a new project from an idea
 * @param idea - The project idea description
 * @param constraints - Project constraints
 * @returns The created project
 */
export async function createProject(
  idea: string,
  constraints: ProjectConstraints
): Promise<Project> {
  // Implementation
}
```

### Formatting

We use Prettier and ESLint:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint -- --fix
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- agents

# Run with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Watch mode
npm test -- --watch
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createProject } from './project-service';

describe('ProjectService', () => {
  beforeEach(async () => {
    // Setup
    await cleanDatabase();
  });

  describe('createProject', () => {
    it('should create a project with valid input', async () => {
      const idea = 'Build a task management API';
      const constraints = { budget: 'medium', timeline: 'normal' };

      const project = await createProject(idea, constraints);

      expect(project).toBeDefined();
      expect(project.id).toBeTruthy();
      expect(project.status).toBe('initializing');
    });

    it('should throw error for invalid constraints', async () => {
      const idea = 'Build an app';
      const constraints = { budget: 'invalid' };

      await expect(
        createProject(idea, constraints)
      ).rejects.toThrow('Invalid budget constraint');
    });
  });
});
```

### Test Coverage Requirements

- Unit tests: Aim for 80%+ coverage
- Integration tests: Cover critical paths
- E2E tests: Cover main user workflows

## 🔀 Pull Request Process

### Before Submitting

1. ✅ All tests pass
2. ✅ Code is formatted and linted
3. ✅ Documentation is updated
4. ✅ Commits follow conventional commits
5. ✅ Branch is up to date with main

### PR Template

When creating a PR, include:

**Description**
- What changes were made?
- Why were these changes needed?
- How were they implemented?

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

**Checklist**
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings

### Review Process

1. **Automated Checks**: CI/CD runs tests and checks
2. **Code Review**: At least one maintainer review required
3. **Changes Requested**: Address feedback and push updates
4. **Approval**: Once approved, PR can be merged
5. **Merge**: Squash and merge into main

## 🚀 Release Process

Releases are managed by maintainers:

1. Version bump following [Semantic Versioning](https://semver.org/)
2. Update CHANGELOG.md
3. Create release tag
4. GitHub Actions builds and publishes
5. Deploy to production

### Version Guidelines

- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, backward compatible

## 📚 Additional Resources

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Agent Development Guide](./docs/AGENTS.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 💬 Getting Help

- **Discord**: [Join our community](https://discord.gg/manipula)
- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs and request features

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website

Thank you for contributing to Manipula! 🎉
