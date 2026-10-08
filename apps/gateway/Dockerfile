# ============================================================================
# Stage 1: Builder — install deps, compile TypeScript
# ============================================================================
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.1.0

WORKDIR /app

# Copy root workspace manifests and shared packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Copy target service
COPY apps/gateway/ ./apps/gateway/

# Install dependencies for gateway and its workspace deps
RUN pnpm install --filter @expense-tracker/gateway... --frozen-lockfile

WORKDIR /app/apps/gateway
RUN pnpm build

# ============================================================================
# Stage 2: Production — minimal runtime image
# ============================================================================
FROM node:20-alpine AS production
RUN npm install -g pnpm@9.1.0

WORKDIR /app

# Copy root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Copy service package.json for production install
COPY apps/gateway/package.json ./apps/gateway/

# Install production dependencies only
RUN pnpm install --filter @expense-tracker/gateway... --prod

WORKDIR /app/apps/gateway

# Copy compiled output from builder
COPY --from=builder /app/apps/gateway/dist ./dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/live').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3001
USER node
CMD ["node", "dist/index.js"]
