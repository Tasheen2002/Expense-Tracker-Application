import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerExpenseLedgerRoutes } from './modules/expense-ledger/infrastructure/http/routes';
import { registerBudgetRoutes } from './modules/budget-management/infrastructure/http/routes';
import { registerCostAllocationRoutes } from './modules/cost-allocation/infrastructure/http/routes';
import { registerBudgetPlanningRoutes } from './modules/budget-planning/infrastructure/http/routes';
import { registerInventoryRoutes } from './modules/inventory-management/infrastructure/http/routes';

/**
 * Creates and configures a Fastify server for the Expense Budgeting Service.
 * Does NOT start listening — used by both `index.ts` and integration tests.
 */
export async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : { level: 'info' },
  });

  await fastify.register(securityPlugin);
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);
  await fastify.register(errorPlugin);

  container.register(fastify.prisma);

  const expenseLedgerServices = container.getExpenseLedgerServices();
  await registerExpenseLedgerRoutes(fastify as any, expenseLedgerServices, expenseLedgerServices.prisma);

  const budgetManagementServices = container.getBudgetManagementServices();
  await registerBudgetRoutes(fastify as any, budgetManagementServices, budgetManagementServices.prisma);

  const costAllocationServices = container.getCostAllocationServices();
  await registerCostAllocationRoutes(fastify as any, costAllocationServices, costAllocationServices.prisma);

  const budgetPlanningServices = container.getBudgetPlanningServices();
  await registerBudgetPlanningRoutes(fastify as any, budgetPlanningServices, budgetPlanningServices.prisma);

  const inventoryManagementServices = container.getInventoryManagementServices();
  await registerInventoryRoutes(fastify as any, inventoryManagementServices, inventoryManagementServices.prisma);

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'expense-budgeting-service',
    uptime: process.uptime(),
  }));

  return fastify;
}
