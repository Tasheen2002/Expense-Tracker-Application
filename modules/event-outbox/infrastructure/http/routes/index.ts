import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { outboxEventRoutes } from './outbox-event.routes';
import { OutboxEventController } from '../controllers/outbox-event.controller';

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
      await outboxEventRoutes(instance, controllers.outboxEventController);
    },
    { prefix: '/api/v1' },
  );
}
