import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { receiptRoutes } from './receipt.routes';
import { tagRoutes } from './tag.routes';
import { ReceiptController } from '../controllers/receipt.controller';
import { TagController } from '../controllers/tag.controller';

export async function registerReceiptVaultRoutes(
  fastify: FastifyInstance,
  controllers: {
    receiptController: ReceiptController;
    tagController: TagController;
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // Register receipt routes
      await receiptRoutes(instance, controllers.receiptController, prisma);

      // Register receipt tag routes
      await tagRoutes(instance, controllers.tagController, prisma);
    },
    { prefix: '/api/v1' }
  );
}
