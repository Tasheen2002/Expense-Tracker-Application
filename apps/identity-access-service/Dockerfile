# ============================================================================
# Stage 1: Builder — install deps, generate Prisma, compile TypeScript
# ============================================================================
FROM node:20-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app

# Copy root workspace manifests and shared packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Copy target service
COPY apps/identity-access-service/ ./apps/identity-access-service/

# Install dependencies for this service and its workspace deps
RUN pnpm install --filter @expense-tracker/identity-access-service...

WORKDIR /app/apps/identity-access-service
RUN npx prisma generate
RUN pnpm build

# ============================================================================
# Stage 2: Production — minimal runtime image
# ============================================================================
FROM node:20-alpine AS production
RUN npm install -g pnpm

WORKDIR /app

# Copy root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Copy service package.json for production install
COPY apps/identity-access-service/package.json ./apps/identity-access-service/
COPY apps/identity-access-service/prisma/ ./apps/identity-access-service/prisma/

# Install production dependencies only
RUN pnpm install --filter @expense-tracker/identity-access-service... --prod

WORKDIR /app/apps/identity-access-service

# Copy compiled output from builder
COPY --from=builder /app/apps/identity-access-service/dist ./dist
RUN npx prisma generate

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3002) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3002
USER node
CMD ["node", "dist/index.js"]
