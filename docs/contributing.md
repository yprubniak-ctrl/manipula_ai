# Contributing to Manipula

Thank you for your interest in contributing to Manipula! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/manipula-platform.git
   cd manipula-platform
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/manipula/manipula-platform.git
   ```

4. Install dependencies:
   ```bash
   pnpm install
   ```

5. Run setup script:
   ```bash
   pnpm run setup
   ```

6. Start development servers:
   ```bash
   pnpm dev
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/improvements

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Write/update tests for your changes

4. Run tests locally:
   ```bash
   pnpm test
   pnpm test:integration
   ```

5. Run linter and type checker:
   ```bash
   pnpm lint
   pnpm type-check
   ```

6. Commit your changes:
   ```bash
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```bash
feat(agents): add retry logic to backend agent
fix(orchestrator): correct state patch application
docs(api): update authentication examples
test(state-manager): add rollback test cases
```

### Pull Request Process

1. Update your branch with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

3. Open a Pull Request on GitHub

4. Fill out the PR template with:
   - Description of changes
   - Related issue number (if applicable)
   - Testing performed
   - Screenshots (if UI changes)

5. Wait for review and address feedback

6. Once approved, your PR will be merged

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer functional programming patterns
- Avoid `any` type, use proper types

**Example:**
```typescript
/**
 * Apply patches to project state
 * @param projectId - Unique project identifier
 * @param patches - Array of state patches to apply
 * @returns Updated project state
 * @throws StateValidationError if patches are invalid
 */
export async function applyPatches(
  projectId: string,
  patches: StatePatch[]
): Promise<ProjectState> {
  // Implementation
}
```

### File Organization

```
src/
├── index.ts           # Main entry point
├── types/             # Type definitions
├── utils/             # Utility functions
├── services/          # Business logic
├── controllers/       # API controllers
└── __tests__/         # Tests
```

### Testing

- Write tests for all new features
- Aim for >80% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

**Example:**
```typescript
describe('StateManager', () => {
  describe('applyPatches', () => {
    it('should successfully apply set operation patch', () => {
      // Arrange
      const state = createProjectState(mockRequirements);
      const patch = createStatePatch('backend.api', 'set', mockApi);
      
      // Act
      const newState = stateManager.applyPatches(state.id, [patch]);
      
      // Assert
      expect(newState.backend.api).toEqual(mockApi);
      expect(newState.version).toBe(state.version + 1);
    });
  });
});
```

## Project Structure

### Adding a New Agent

1. Create agent directory:
   ```bash
   mkdir -p agents/your-agent-name/{src,__tests__}
   ```

2. Create `package.json`:
   ```json
   {
     "name": "@manipula/agent-your-agent-name",
     "version": "0.1.0",
     "dependencies": {
       "@manipula/shared": "workspace:*",
       "@manipula/agent-sdk": "workspace:*"
     }
   }
   ```

3. Implement agent class extending `BaseAgent`:
   ```typescript
   import { BaseAgent } from '@manipula/agent-sdk';
   
   export class YourAgent extends BaseAgent {
     async execute(input: AgentInput): Promise<AgentOutput> {
       // Implementation
     }
   }
   ```

4. Add tests in `__tests__/`

5. Update documentation

### Adding a New Package

1. Create package directory under `packages/`
2. Add `package.json` with workspace dependencies
3. Implement package functionality
4. Add to root `package.json` workspaces
5. Update dependent packages

## Documentation

- Update README.md for significant changes
- Add/update API documentation in `docs/`
- Include inline code comments
- Update CHANGELOG.md

## Testing Guidelines

### Unit Tests
```bash
pnpm test                    # All unit tests
pnpm test --watch           # Watch mode
pnpm test:coverage          # With coverage
```

### Integration Tests
```bash
pnpm test:integration       # All integration tests
```

### E2E Tests
```bash
pnpm test:e2e              # End-to-end tests
```

### Manual Testing

1. Start all services: `pnpm dev`
2. Test in browser: http://localhost:3001
3. Test API with curl/Postman
4. Verify database changes in PgAdmin

## Performance Considerations

- Profile code for bottlenecks
- Minimize AI API calls
- Cache frequently accessed data
- Use batch operations where possible
- Consider memory usage for large projects

## Security

- Never commit API keys or secrets
- Validate all user inputs
- Sanitize AI outputs
- Use parameterized queries
- Keep dependencies updated
- Report security issues privately to security@manipula.dev

## Documentation

- Add JSDoc comments to public APIs
- Update architecture docs for major changes
- Include examples in API documentation
- Keep README up to date

## Release Process

1. Version bump in package.json files
2. Update CHANGELOG.md
3. Create git tag: `git tag v0.1.0`
4. Push tag: `git push origin v0.1.0`
5. GitHub Actions will handle deployment

## Getting Help

- Discord: https://discord.gg/manipula
- GitHub Issues: For bugs and feature requests
- GitHub Discussions: For questions and ideas
- Email: dev@manipula.dev

## Recognition

Contributors will be added to:
- README.md contributors section
- CONTRIBUTORS.md file
- GitHub repository insights

Thank you for contributing to Manipula! 🎉
