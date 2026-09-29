import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { supplierRoutes } from './supplier.routes';
import { locationRoutes } from './location.routes';
import { purchaseOrderRoutes } from './purchase-order.routes';
import { stockRoutes } from './stock.routes';
import { SupplierController } from '../controllers/supplier.controller';
import { LocationController } from '../controllers/location.controller';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { StockController } from '../controllers/stock.controller';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function registerInventoryRoutes(
  fastify: FastifyInstance,
  controllers: {
    supplierController: SupplierController;
    locationController: LocationController;
    purchaseOrderController: PurchaseOrderController;
    stockController: StockController;
  },
  _prisma: PrismaClient
): Promise<void> {
  await fastify.register(
    async (instance) => {
      instance.addHook('preHandler', async (request, reply) => {
        if (request.method !== 'GET') {
          await writeRateLimiter(request, reply);
        }
      });
      await supplierRoutes(instance, controllers.supplierController);
      await locationRoutes(instance, controllers.locationController);
      await purchaseOrderRoutes(instance, controllers.purchaseOrderController);
      await stockRoutes(instance, controllers.stockController);
    },
    { prefix: '/api/v1' }
  );
}
