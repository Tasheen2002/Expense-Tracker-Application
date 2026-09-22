import { FastifyInstance } from 'fastify';
import { receiptRoutes } from './receipt.routes';
import { tagRoutes } from './tag.routes';
import { ReceiptController } from '../controllers/receipt.controller';
import { TagController } from '../controllers/tag.controller';

export async function registerReceiptVaultRoutes(
  fastify: FastifyInstance,
  controllers: {
    receiptController: ReceiptController;
    tagController: TagController;
  }
): Promise<void> {
  await fastify.register(
    async (instance) => {
      // Register receipt routes
      await receiptRoutes(instance, controllers.receiptController);

      // Register receipt tag routes
      await tagRoutes(instance, controllers.tagController);
    },
    { prefix: '/api/v1' }
  );
}
