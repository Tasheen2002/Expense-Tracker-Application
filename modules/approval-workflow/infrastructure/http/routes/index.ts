import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { approvalChainRoutes } from './approval-chain.routes';
import { workflowRoutes } from './workflow.routes';
import { ApprovalChainController } from '../controllers/approval-chain.controller';
import { WorkflowController } from '../controllers/workflow.controller';
import { workspaceAuthorizationMiddleware } from '../../../../../apps/api/src/shared/middleware';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

export async function registerApprovalWorkflowRoutes(
  fastify: FastifyInstance,
  controllers: {
    approvalChainController: ApprovalChainController;
    workflowController: WorkflowController;
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // First authenticate the request
      instance.addHook('onRequest', async (request, reply) => {
        await fastify.authenticate(request);
      });

      // Add workspace authorization middleware to all routes
      instance.addHook('preHandler', async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma
        );
      });

      // Register approval chain routes
      await approvalChainRoutes(instance, controllers.approvalChainController);

      // Register workflow routes
      await workflowRoutes(instance, controllers.workflowController);
    },
    { prefix: '/api/v1' }
  );
}
