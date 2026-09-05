import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { approvalChainRoutes } from './approval-chain.routes';
import { workflowRoutes } from './workflow.routes';
import { ApprovalChainController } from '../controllers/approval-chain.controller';
import { WorkflowController } from '../controllers/workflow.controller';

export async function registerApprovalWorkflowRoutes(
  fastify: FastifyInstance,
  controllers: {
    approvalChainController: ApprovalChainController;
    workflowController: WorkflowController;
  },
  _prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // Register approval chain routes
      await approvalChainRoutes(instance, controllers.approvalChainController);

      // Register workflow routes
      await workflowRoutes(instance, controllers.workflowController);
    },
    { prefix: '/api/v1' }
  );
}
