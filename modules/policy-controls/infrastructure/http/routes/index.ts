import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { policyRoutes } from './policy.routes';
import { violationRoutes } from './violation.routes';
import { exemptionRoutes } from './exemption.routes';
import { PolicyController } from '../controllers/policy.controller';
import { ViolationController } from '../controllers/violation.controller';
import { ExemptionController } from '../controllers/exemption.controller';
import { workspaceAuthorizationMiddleware } from '../../../../../apps/api/src/shared/middleware';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

export async function registerPolicyControlsRoutes(
  fastify: FastifyInstance,
  controllers: {
    policyController: PolicyController;
    violationController: ViolationController;
    exemptionController: ExemptionController;
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // First authenticate the request
      instance.addHook('onRequest', async (request, reply) => {
        await fastify.authenticate(request);
      });

      // Then authorize workspace access
      instance.addHook('preHandler', async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma
        );
      });

      // Register policy routes
      await policyRoutes(instance, controllers.policyController);

      // Register violation routes
      await violationRoutes(instance, controllers.violationController);

      // Register exemption routes
      await exemptionRoutes(instance, controllers.exemptionController);
    },
    { prefix: '/api/v1' }
  );
}
