FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.1.0 && apk add --no-cache openssl
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/receipt-vault-service/ ./apps/receipt-vault-service/
RUN pnpm install --filter @expense-tracker/receipt-vault-service... --frozen-lockfile
WORKDIR /app/apps/receipt-vault-service
RUN pnpm exec prisma generate && pnpm build

FROM node:20-alpine AS production
ENV NODE_ENV=production
ENV RECEIPT_UPLOAD_DIR=/app/uploads
RUN npm install -g pnpm@9.1.0 && apk add --no-cache openssl
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/receipt-vault-service/package.json ./apps/receipt-vault-service/
COPY apps/receipt-vault-service/prisma/ ./apps/receipt-vault-service/prisma/
RUN pnpm install --filter @expense-tracker/receipt-vault-service... --prod --frozen-lockfile
COPY --from=builder /app/apps/receipt-vault-service/node_modules/.prisma /app/apps/receipt-vault-service/node_modules/.prisma
COPY --from=builder /app/apps/receipt-vault-service/dist /app/apps/receipt-vault-service/dist
RUN mkdir -p /app/uploads && chown node:node /app/uploads
WORKDIR /app/apps/receipt-vault-service
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3007) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
EXPOSE 3007
USER node
CMD ["node", "dist/index.js"]
