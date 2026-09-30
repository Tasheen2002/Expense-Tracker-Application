# ============================================================================
# Stage 1: Builder — install deps, generate Prisma, compile TypeScript
# ============================================================================
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.1.0
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root workspace manifests and shared packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Copy target service
COPY apps/expense-budgeting-service/ ./apps/expense-budgeting-service/

# Install dependencies for this service and its workspace deps
RUN pnpm install --filter @expense-tracker/expense-budgeting-service...

WORKDIR /app/apps/expense-budgeting-service
RUN npx prisma generate
RUN pnpm build

# ============================================================================
# Stage 2: Production — minimal runtime image
# ============================================================================
FROM node:20-alpine AS production
RUN npm install -g pnpm@9.1.0
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Copy service package.json for production install
COPY apps/expense-budgeting-service/package.json ./apps/expense-budgeting-service/
COPY apps/expense-budgeting-service/prisma/ ./apps/expense-budgeting-service/prisma/

# Install production dependencies only
RUN pnpm install --filter @expense-tracker/expense-budgeting-service... --prod

# Copy generated Prisma client from builder (reproducible, no runtime CLI download)
COPY --from=builder /app/apps/expense-budgeting-service/node_modules/.prisma /app/apps/expense-budgeting-service/node_modules/.prisma

WORKDIR /app/apps/expense-budgeting-service

# Copy compiled output from builder
COPY --from=builder /app/apps/expense-budgeting-service/dist ./dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3003) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3003
USER node
CMD ["node", "dist/index.js"]
