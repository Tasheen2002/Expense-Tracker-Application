import { FastifyInstance } from 'fastify';
import { PrismaClient } from '../../../../../prisma-client';
import { registerNotificationRoutes } from './notification.routes';
import { registerTemplateRoutes } from './template.routes';
import { registerPreferenceRoutes } from './preference.routes';
import { registerNotificationOutboxEventRoutes } from './outbox-event.routes';
import { AccountNotificationService } from '../../../application/services/account-notification.service';
import { AccountNotificationController } from '../controllers/account-notification.controller';
import { accountNotificationRoutes } from './account-notification.routes';

export async function registerNotificationDispatchRoutes(
  fastify: FastifyInstance,
  controllers: {
    notificationController: Parameters<typeof registerNotificationRoutes>[1];
    templateController: Parameters<typeof registerTemplateRoutes>[1];
    preferenceController: Parameters<typeof registerPreferenceRoutes>[1];
    accountNotificationController: AccountNotificationController;
  },
  prisma: PrismaClient,
  accountService: AccountNotificationService
): Promise<void> {
  await fastify.register(
    async (instance) => {
      // User-facing notification routes
      await registerNotificationRoutes(
        instance,
        controllers.notificationController
      );

      // User preference routes
      await registerPreferenceRoutes(
        instance,
        controllers.preferenceController
      );

      // Admin template routes
      await registerTemplateRoutes(instance, controllers.templateController);

      // Outbox webhook event consumer
      await registerNotificationOutboxEventRoutes(
        instance,
        prisma,
        accountService
      );
      await accountNotificationRoutes(
        instance,
        controllers.accountNotificationController
      );
    },
    { prefix: '/api/v1' }
  );
}

// Re-export individual route functions for testing
export { registerNotificationRoutes } from './notification.routes';
export { registerTemplateRoutes } from './template.routes';
export { registerPreferenceRoutes } from './preference.routes';
export { registerNotificationOutboxEventRoutes } from './outbox-event.routes';
