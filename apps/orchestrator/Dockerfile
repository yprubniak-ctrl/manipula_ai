# Base stage
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@8.12.0
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/state-manager/package.json ./packages/state-manager/
COPY packages/agent-sdk/package.json ./packages/agent-sdk/
COPY apps/orchestrator/package.json ./apps/orchestrator/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build --filter=@manipula/orchestrator...

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 orchestrator

# Copy built artifacts and dependencies
COPY --from=builder --chown=orchestrator:nodejs /app/apps/orchestrator/dist ./apps/orchestrator/dist
COPY --from=builder --chown=orchestrator:nodejs /app/packages ./packages
COPY --from=builder --chown=orchestrator:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=orchestrator:nodejs /app/package.json ./

USER orchestrator
EXPOSE 4000

CMD ["node", "apps/orchestrator/dist/index.js"]
