import 'dotenv/config';
import Fastify from 'fastify';

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
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3003', 10);

const start = async () => {
  try {
    // 1. Register security, db, auth, and error plugins
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    // 2. Initialize DI container
    container.register(fastify.prisma);

    // 3. Register route handlers for all modules
    const expenseLedgerServices = container.getExpenseLedgerServices();
    await registerExpenseLedgerRoutes(
      fastify as any,
      expenseLedgerServices,
      expenseLedgerServices.prisma
    );

    const budgetManagementServices = container.getBudgetManagementServices();
    await registerBudgetRoutes(
      fastify as any,
      budgetManagementServices,
      budgetManagementServices.prisma
    );

    const costAllocationServices = container.getCostAllocationServices();
    await registerCostAllocationRoutes(
      fastify as any,
      costAllocationServices,
      costAllocationServices.prisma
    );

    const budgetPlanningServices = container.getBudgetPlanningServices();
    await registerBudgetPlanningRoutes(
      fastify as any,
      budgetPlanningServices,
      budgetPlanningServices.prisma
    );

    const inventoryManagementServices = container.getInventoryManagementServices();
    await registerInventoryRoutes(
      fastify as any,
      inventoryManagementServices,
      inventoryManagementServices.prisma
    );

    // 4. Start Outbox Worker with HttpWebhookPublisher
    const outboxRepo = new PrismaOutboxEventRepository(fastify.prisma);
    const webhookRoutes = {
      'expense.created': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
      ],
      'expense.approved': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
        'http://localhost:3008/api/v1/event-outbox/events', // Notification
      ],
      'expense.rejected': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
        'http://localhost:3008/api/v1/event-outbox/events', // Notification
      ],
      'expense.submitted': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
      ],
      'expense.status_changed': [
        'http://localhost:3008/api/v1/event-outbox/events', // Notification
      ],
      'budget.threshold_exceeded': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
        'http://localhost:3008/api/v1/event-outbox/events', // Notification
      ],
      'budget.updated': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
      ],
    };
    
    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(outboxRepo, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();

    // Graceful shutdown hooks
    fastify.addHook('onClose', async () => {
      outboxWorker.stop();
    });

    fastify.get('/health', async () => {
      return { status: 'ok', service: 'expense-budgeting-service', uptime: process.uptime() };
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Expense-Budgeting-Service] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
