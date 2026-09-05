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
COPY apps/approval-policy-service/ ./apps/approval-policy-service/

# Install dependencies for this service and its workspace deps
RUN pnpm install --filter @expense-tracker/approval-policy-service...

WORKDIR /app/apps/approval-policy-service
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
COPY apps/approval-policy-service/package.json ./apps/approval-policy-service/
COPY apps/approval-policy-service/prisma/ ./apps/approval-policy-service/prisma/

# Install production dependencies only
RUN pnpm install --filter @expense-tracker/approval-policy-service... --prod

WORKDIR /app/apps/approval-policy-service

# Copy compiled output from builder
COPY --from=builder /app/apps/approval-policy-service/dist ./dist
RUN npx prisma generate

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3005) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3005
USER node
CMD ["node", "dist/index.js"]
