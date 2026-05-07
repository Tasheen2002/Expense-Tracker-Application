import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { outboxEventRoutes } from './outbox-event.routes';
import { OutboxEventController } from '../controllers/outbox-event.controller';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';

export interface EventOutboxModuleControllers {
  outboxEventController: OutboxEventController;
}

export async function registerEventOutboxRoutes(
  fastify: FastifyInstance,
  controllers: EventOutboxModuleControllers,
  prisma: PrismaClient,
): Promise<void> {
  await fastify.register(
    async (instance) => {
      instance.addHook('preHandler', async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma,
        );
      });

      await outboxEventRoutes(instance, controllers.outboxEventController);
    },
    { prefix: '/api/v1' },
  );
}
