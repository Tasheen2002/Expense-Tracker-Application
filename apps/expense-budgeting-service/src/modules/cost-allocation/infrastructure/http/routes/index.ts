import { FastifyInstance } from 'fastify';
import { allocationManagementRoutes } from './allocation-management.routes';
import { expenseAllocationRoutes } from './expense-allocation.routes';
import { AllocationManagementController } from '../controllers/allocation-management.controller';
import { ExpenseAllocationController } from '../controllers/expense-allocation.controller';
import { createRateLimiter, RateLimitPresets, userKeyGenerator } from '@shared/middleware/rate-limiter.middleware';

export async function registerCostAllocationRoutes(
  fastify: FastifyInstance,
  controllers: {
    allocationManagementController: AllocationManagementController;
    expenseAllocationController: ExpenseAllocationController;
  }
) {
  const writeRateLimiter = createRateLimiter({
    ...RateLimitPresets.writeOperations,
    keyGenerator: userKeyGenerator,
  });
  await fastify.register(
    async (instance) => {
      await allocationManagementRoutes(
        instance,
        controllers.allocationManagementController,
        writeRateLimiter
      );
      await expenseAllocationRoutes(
        instance,
        controllers.expenseAllocationController,
        writeRateLimiter
      );
    },
    { prefix: '/api/v1' }
  );
}
