#!/bin/bash

# ===========================================
# MANIPULA PLATFORM - DIRECTORY STRUCTURE SETUP
# ===========================================

set -e

echo "🏗️  Creating Manipula Platform directory structure..."

# Root directories
mkdir -p manipula-platform/{agents,orchestrator,api,cli,web,packages,infrastructure,tests,docs,scripts,examples}

# Agents
echo "📦 Creating agent directories..."
mkdir -p manipula-platform/agents/{idea-agent,backend-agent,frontend-agent,qa-agent,devops-agent}

for agent in idea-agent backend-agent frontend-agent qa-agent devops-agent; do
  mkdir -p "manipula-platform/agents/$agent"/{src,tests,dist}
  mkdir -p "manipula-platform/agents/$agent/src"/{core,utils,prompts,validators}
done

# Orchestrator
echo "🎛️  Creating orchestrator directories..."
mkdir -p manipula-platform/orchestrator/{src,tests,dist}
mkdir -p manipula-platform/orchestrator/src/{core,state,models,queue,validators,utils}

# API
echo "🌐 Creating API directories..."
mkdir -p manipula-platform/api/{src,tests,dist}
mkdir -p manipula-platform/api/src/{routes,controllers,middleware,services,models,utils}

# CLI
echo "💻 Creating CLI directories..."
mkdir -p manipula-platform/cli/{src,bin,tests,dist}

# Web
echo "🖥️  Creating Web dashboard directories..."
mkdir -p manipula-platform/web/{src,public,tests}
mkdir -p manipula-platform/web/src/{app,components,lib,hooks,styles}
mkdir -p manipula-platform/web/src/components/{ui,features,layouts}

# Packages
echo "📚 Creating shared packages..."
mkdir -p manipula-platform/packages/shared/{src,tests,dist}
mkdir -p manipula-platform/packages/shared/src/{types,utils,constants,validators}

# Infrastructure
echo "☁️  Creating infrastructure directories..."
mkdir -p manipula-platform/infrastructure/{terraform,kubernetes,docker,monitoring,scripts}
mkdir -p manipula-platform/infrastructure/terraform/{modules,environments}
mkdir -p manipula-platform/infrastructure/kubernetes/{base,overlays}
mkdir -p manipula-platform/infrastructure/monitoring/{prometheus,grafana,alertmanager}
mkdir -p manipula-platform/infrastructure/monitoring/grafana/{dashboards,datasources}

# Tests
echo "🧪 Creating test directories..."
mkdir -p manipula-platform/tests/{unit,integration,e2e,fixtures,mocks}

# Documentation
echo "📖 Creating documentation directories..."
mkdir -p manipula-platform/docs/{api,architecture,agents,deployment,guides,examples}

# Scripts
echo "🔧 Creating scripts directory..."
mkdir -p manipula-platform/scripts/{setup,deployment,maintenance,testing}

# Examples
echo "📝 Creating examples directory..."
mkdir -p manipula-platform/examples/{basic,advanced,custom-agents}

# Database
echo "🗄️  Creating database directories..."
mkdir -p manipula-platform/prisma/{migrations,seeds}

# Logs and State
echo "📊 Creating runtime directories..."
mkdir -p manipula-platform/{logs,state,artifacts,uploads}

# Hidden directories
mkdir -p manipula-platform/{.github,.vscode,.husky}
mkdir -p manipula-platform/.github/{workflows,ISSUE_TEMPLATE}

echo "✅ Directory structure created successfully!"

# Create placeholder files
echo "📄 Creating placeholder files..."

# README files for major directories
touch manipula-platform/agents/README.md
touch manipula-platform/orchestrator/README.md
touch manipula-platform/api/README.md
touch manipula-platform/cli/README.md
touch manipula-platform/web/README.md
touch manipula-platform/packages/README.md
touch manipula-platform/infrastructure/README.md
touch manipula-platform/tests/README.md
touch manipula-platform/docs/README.md

# Package.json for workspaces
for dir in agents/idea-agent agents/backend-agent agents/frontend-agent agents/qa-agent agents/devops-agent orchestrator api cli web packages/shared; do
  if [ ! -f "manipula-platform/$dir/package.json" ]; then
    touch "manipula-platform/$dir/package.json"
  fi
done

# TypeScript configs
for dir in agents/idea-agent agents/backend-agent agents/frontend-agent agents/qa-agent agents/devops-agent orchestrator api cli packages/shared; do
  if [ ! -f "manipula-platform/$dir/tsconfig.json" ]; then
    touch "manipula-platform/$dir/tsconfig.json"
  fi
done

echo "✨ Setup complete! Navigate to manipula-platform/ to get started."
echo ""
echo "Next steps:"
echo "  1. cd manipula-platform"
echo "  2. cp .env.example .env"
echo "  3. Edit .env with your API keys"
echo "  4. npm install"
echo "  5. docker-compose up -d"
echo ""
echo "Happy building! 🚀"
