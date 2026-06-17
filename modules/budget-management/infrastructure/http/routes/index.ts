import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { budgetRoutes } from './budget.routes';
import { spendingLimitRoutes } from './spending-limit.routes';
import { BudgetController } from '../controllers/budget.controller';
import { SpendingLimitController } from '../controllers/spending-limit.controller';

export async function registerBudgetRoutes(
  fastify: FastifyInstance,
  controllers: {
    budgetController: BudgetController;
    spendingLimitController: SpendingLimitController;
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      await budgetRoutes(instance, controllers.budgetController, prisma);
      await spendingLimitRoutes(instance, controllers.spendingLimitController, prisma);
    },
    { prefix: '/api/v1' }
  );
}
