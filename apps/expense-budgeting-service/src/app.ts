import { verifyDatabaseReadiness } from './shared/infrastructure/persistence/database-readiness';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { createCompositionRoot, CompositionRoot, CompositionRootOptions } from './composition-root';
import { registerExpenseLedgerRoutes } from './modules/expense-ledger/infrastructure/http/routes';
import { registerExpenseOutboxEventRoutes } from './modules/expense-ledger/infrastructure/http/routes/outbox-event.routes';
import { registerBudgetRoutes } from './modules/budget-management/infrastructure/http/routes';
import { registerCostAllocationRoutes } from './modules/cost-allocation/infrastructure/http/routes';
import { registerBudgetPlanningRoutes } from './modules/budget-planning/infrastructure/http/routes';
import { registerInventoryRoutes } from './modules/inventory-management/infrastructure/http/routes';

declare module 'fastify' {
  interface FastifyInstance {
    compositionRoot: CompositionRoot;
  }
}

export interface ExpenseAppOptions {
  /** App owns the client; callback drains background work before disconnect. */
  beforeDatabaseDisconnect?: () => Promise<void>;
  enableInternalAuth?: boolean;
  logger?: boolean;
  prisma?: PrismaClient;
  compositionRootFactory?: (prisma: PrismaClient, options?: CompositionRootOptions) => CompositionRoot;
  compositionRootOptions?: CompositionRootOptions;
}

/**
 * Factory to construct and configure the Expense Budgeting Service Fastify application.
 */
export async function buildExpenseApp(options?: ExpenseAppOptions): Promise<FastifyInstance> {
  if (process.env.NODE_ENV === 'production') {
    if (options?.enableInternalAuth === false) throw new Error('Internal authentication cannot be disabled in production');
    if (!process.env.INTERNAL_API_KEY?.trim()) throw new Error('INTERNAL_API_KEY is required in production');
  }
  const isTest = process.env.NODE_ENV === 'test';
  const fastify = Fastify({
    logger: options?.logger !== undefined ? options.logger : (isTest ? false : true),
  });

  try {

    // 1. Correlation ID plugin
    await fastify.register(correlationPlugin);

    // 2. Service-to-service internal authentication
    if (options?.enableInternalAuth !== false) {
      await fastify.register(internalAuthPlugin);
    }

    // 3. Security, database, auth, and error plugins
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin, { prisma: options?.prisma, beforeDatabaseDisconnect: options?.beforeDatabaseDisconnect });
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    // 4. Pure typed Composition Root
    const rootFactory = options?.compositionRootFactory ?? createCompositionRoot;
    const compositionRoot = rootFactory(fastify.prisma, options?.compositionRootOptions);
    fastify.decorate('compositionRoot', compositionRoot);

    // 5. Register module routes
    await registerExpenseLedgerRoutes(fastify, compositionRoot.expenseLedger, compositionRoot.prisma);
    await registerExpenseOutboxEventRoutes(fastify, compositionRoot.expenseLedger.expenseService, compositionRoot.prisma);
    await registerBudgetRoutes(fastify, compositionRoot.budgetManagement);
    await registerCostAllocationRoutes(fastify, compositionRoot.costAllocation);
    await registerBudgetPlanningRoutes(fastify, compositionRoot.budgetPlanning, compositionRoot.prisma);
    await registerInventoryRoutes(fastify, compositionRoot.inventoryManagement, compositionRoot.prisma);

    // 6. Deep Health Check (Postgres ping)
    fastify.get('/health', async (_request, reply) => {
      try {
        await verifyDatabaseReadiness(fastify.prisma);
        return {
          status: 'ok',
          service: 'expense-budgeting-service',
          uptime: process.uptime(),
          database: 'connected',
        };
      } catch (error: unknown) {
        fastify.log.error(error, 'Health check database ping failed');
        const isDev = process.env.NODE_ENV === 'development';
        const errMsg = isDev && error instanceof Error ? error.message : 'Database service unavailable';
        return reply.code(503).send({
          status: 'degraded',
          service: 'expense-budgeting-service',
          uptime: process.uptime(),
          database: 'disconnected',
          error: errMsg,
        });
      }
    });

    return fastify;
  } catch (error: unknown) {
    try { await fastify.close(); } catch (cleanupError: unknown) { fastify.log.error({ err: cleanupError }, 'App construction cleanup failed'); }
    throw error;
  }
}

/**
 * Backward-compatible helper for existing tests
 */
export async function createServer(): Promise<FastifyInstance> {
  return buildExpenseApp({ enableInternalAuth: false, logger: false });
}
