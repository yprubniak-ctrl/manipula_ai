# Quick Start Guide - Manipula Platform

Get up and running with Manipula in under 10 minutes!


> **MVP status (March 2026):** This repo currently supports a working orchestrator-engine package MVP.
> Use `pnpm test`, `pnpm build`, and `pnpm type-check` from the repo root for validated workflows.

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js 18 or higher ([Download](https://nodejs.org/))
- ✅ Docker Desktop ([Download](https://www.docker.com/products/docker-desktop))
- ✅ Git ([Download](https://git-scm.com/downloads))
- ✅ API keys from OpenAI or Anthropic

## Step 1: Clone and Setup (2 minutes)

```bash
# Clone the repository
git clone https://github.com/your-org/manipula-platform.git
cd manipula-platform

# Run the automated setup script
chmod +x infrastructure/scripts/setup-dev.sh
./infrastructure/scripts/setup-dev.sh
```

The setup script will:
- ✓ Check your system prerequisites
- ✓ Install dependencies with pnpm
- ✓ Create `.env` file from template
- ✓ Start PostgreSQL and Redis
- ✓ Build all packages

## Step 2: Configure API Keys (1 minute)

Open `.env` and add your API keys:

```bash
# Required: At least one AI provider
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Optional: For local models
LOCAL_MODEL_ENDPOINT=http://localhost:8080
```

**Don't have API keys?**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys

## Step 3: Start Development Servers (1 minute)

```bash
# Start all services
pnpm dev
```

This starts:
- 🌐 Web Dashboard at http://localhost:3001
- 🚀 API Gateway at http://localhost:3000
- 🎯 Orchestrator at http://localhost:4000
- 🤖 Agents Runtime at http://localhost:5000

## Step 4: Create Your First Project (2 minutes)

### Option A: Using the Web Dashboard

1. Open http://localhost:3001 in your browser
2. Click "New Project"
3. Fill in project details:
   ```
   Name: My Todo App
   Description: A simple task management application
   Requirements:
   - User authentication
   - CRUD operations for tasks
   - Mobile-responsive design
   ```
4. Click "Generate" and watch the magic happen! ✨

### Option B: Using the API

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Todo App",
    "description": "A simple task management application",
    "requirements": [
      "User authentication",
      "CRUD operations for tasks",
      "Mobile-responsive design"
    ]
  }'
```

Response:
```json
{
  "project_id": "proj_xyz789",
  "status": "initializing"
}
```

## Step 5: Monitor Progress (2 minutes)

### Check Status
```bash
# Get project status
curl http://localhost:3000/api/projects/proj_xyz789/status

# View execution logs
curl http://localhost:3000/api/projects/proj_xyz789/logs
```

### Watch in Real-Time

The web dashboard shows:
- Current phase (Specification → Backend → Frontend → QA)
- Agent execution progress
- Cost tracking
- Estimated time remaining

## Step 6: Download Your Project (1 minute)

Once complete, download the generated code:

```bash
# Download all artifacts as ZIP
curl http://localhost:3000/api/projects/proj_xyz789/download \
  -o my-todo-app.zip

# Extract
unzip my-todo-app.zip
```

You'll get:
```
my-todo-app/
├── docs/
│   ├── PRD.md              # Product requirements
│   ├── TECHNICAL_SPEC.md   # Technical specification
│   └── ARCHITECTURE.md     # System architecture
├── backend/                # Complete backend code
├── frontend/               # Complete frontend code
└── deployment/             # Deployment configs
```

## What's Next?

### Run the Generated Application

```bash
cd my-todo-app

# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Deploy to Production

```bash
# Deploy using the generated configs
cd deployment
./deploy.sh
```

### Customize and Iterate

- Modify the generated code
- Add new features
- Run QA agent again for validation

## Troubleshooting

### Services won't start?

```bash
# Check if ports are in use
lsof -i :3000 -i :3001 -i :4000 -i :5000

# Stop and restart
pnpm docker:down
pnpm docker:up
pnpm dev
```

### Database connection errors?

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Agent execution fails?

```bash
# Check logs
docker-compose logs -f agents-runtime

# Verify API keys in .env
cat .env | grep API_KEY
```

### Build errors?

```bash
# Clean and rebuild
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

## Advanced Usage

### Custom Agent Configuration

```bash
# Create project with specific tech stack
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "description": "...",
    "requirements": [...],
    "tech_stack": {
      "backend": ["Python", "FastAPI"],
      "frontend": ["Vue.js"],
      "database": "MongoDB"
    },
    "constraints": {
      "budget_usd": 100,
      "timeline_days": 7
    }
  }'
```

### Rollback to Previous Version

```bash
curl -X POST http://localhost:3000/api/projects/proj_xyz789/rollback \
  -H "Content-Type: application/json" \
  -d '{"version": 2}'
```

### Pause/Resume Execution

```bash
# Pause
curl -X POST http://localhost:3000/api/projects/proj_xyz789/pause

# Resume
curl -X POST http://localhost:3000/api/projects/proj_xyz789/resume
```

## Development Tools

### Database Management

```bash
# Start PgAdmin
docker-compose --profile tools up -d pgadmin

# Access at http://localhost:5050
# Email: admin@manipula.dev
# Password: admin
```

### Redis Management

```bash
# Start Redis Commander
docker-compose --profile tools up -d redis-commander

# Access at http://localhost:8081
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f orchestrator
docker-compose logs -f api
```

## Example Projects

### 1. Blog Platform
```json
{
  "name": "Personal Blog",
  "description": "A modern blog with markdown support",
  "requirements": [
    "Markdown editor",
    "SEO optimization",
    "Comment system",
    "Admin dashboard"
  ]
}
```

### 2. E-commerce Store
```json
{
  "name": "Online Store",
  "description": "E-commerce platform for small business",
  "requirements": [
    "Product catalog",
    "Shopping cart",
    "Payment integration (Stripe)",
    "Order management",
    "Email notifications"
  ]
}
```

### 3. SaaS Dashboard
```json
{
  "name": "Analytics Dashboard",
  "description": "Real-time analytics platform",
  "requirements": [
    "User authentication",
    "Real-time data visualization",
    "Export to CSV/PDF",
    "Team collaboration",
    "API access"
  ]
}
```

## Resources

- 📖 [Full Documentation](./docs/)
- 🏗️ [Architecture Guide](./docs/architecture.md)
- 🔌 [API Reference](./docs/api-reference.md)
- 🤝 [Contributing](./docs/contributing.md)
- 💬 [Discord Community](https://discord.gg/manipula)
- 🐛 [Report Issues](https://github.com/manipula/manipula-platform/issues)

## Need Help?

- Check [Troubleshooting](#troubleshooting) above
- Search [GitHub Issues](https://github.com/manipula/manipula-platform/issues)
- Ask in [Discord](https://discord.gg/manipula)
- Email: support@manipula.dev

---

**Congratulations!** 🎉 You're now ready to build software with AI agents!

Next steps: Explore the [Architecture Documentation](./docs/architecture.md) to understand how it all works.
