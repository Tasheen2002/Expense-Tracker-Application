import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { allocationManagementRoutes } from './allocation-management.routes';
import { expenseAllocationRoutes } from './expense-allocation.routes';
import { AllocationManagementController } from '../controllers/allocation-management.controller';
import { ExpenseAllocationController } from '../controllers/expense-allocation.controller';

export async function registerCostAllocationRoutes(
  fastify: FastifyInstance,
  controllers: {
    allocationManagementController: AllocationManagementController;
    expenseAllocationController: ExpenseAllocationController;
  },
  _prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      await allocationManagementRoutes(
        instance,
        controllers.allocationManagementController
      );
      await expenseAllocationRoutes(
        instance,
        controllers.expenseAllocationController
      );
    },
    { prefix: '/api/v1' }
  );
}
