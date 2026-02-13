#!/bin/bash

set -e

echo "🚀 Setting up Manipula Platform for development..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm is not installed. Installing...${NC}"
    npm install -g pnpm@8.12.0
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker $(docker -v)${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose $(docker-compose -v)${NC}"

echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
pnpm install

echo ""
echo -e "${BLUE}Setting up environment variables...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
    echo -e "${YELLOW}⚠ Please edit .env and add your API keys${NC}"
else
    echo -e "${YELLOW}✓ .env file already exists${NC}"
fi

echo ""
echo -e "${BLUE}Creating required directories...${NC}"
mkdir -p logs
mkdir -p storage
mkdir -p state-snapshots
echo -e "${GREEN}✓ Directories created${NC}"

echo ""
echo -e "${BLUE}Starting Docker services...${NC}"
docker-compose up -d postgres redis
echo -e "${GREEN}✓ PostgreSQL and Redis started${NC}"

echo ""
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 5

# Check if PostgreSQL is ready
echo -n "Checking PostgreSQL... "
until docker-compose exec -T postgres pg_isready -U manipula &> /dev/null; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

# Check if Redis is ready
echo -n "Checking Redis... "
until docker-compose exec -T redis redis-cli ping &> /dev/null; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

echo ""
echo -e "${BLUE}Building packages...${NC}"
pnpm build
echo -e "${GREEN}✓ Build complete${NC}"

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit .env and add your API keys:"
echo "   - OPENAI_API_KEY"
echo "   - ANTHROPIC_API_KEY"
echo ""
echo "2. Start the development servers:"
echo "   ${GREEN}pnpm dev${NC}"
echo ""
echo "3. Access the services:"
echo "   - Web Dashboard: http://localhost:3001"
echo "   - API Gateway: http://localhost:3000"
echo "   - Orchestrator: http://localhost:4000"
echo "   - Agents Runtime: http://localhost:5000"
echo ""
echo "4. Optional: Start management tools:"
echo "   ${GREEN}docker-compose --profile tools up -d${NC}"
echo "   - PgAdmin: http://localhost:5050"
echo "   - Redis Commander: http://localhost:8081"
echo ""
echo -e "${YELLOW}Happy coding! 🎉${NC}"
