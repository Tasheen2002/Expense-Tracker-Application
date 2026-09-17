import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerNotificationDispatchRoutes } from './modules/notification-dispatch/infrastructure/http/routes';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3008', 10);

const start = async () => {
  try {
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    });

    container.register(fastify.prisma);

    const notificationServices = container.getNotificationServices();
    await registerNotificationDispatchRoutes(
      fastify as any,
      notificationServices,
      notificationServices.prisma
    );

    const outboxEventRepository = container.get<any>('outboxEventRepository');

    const webhookRoutes = {
      NotificationCreated: ['http://localhost:3009/api/v1/event-outbox/events'],
      NotificationSent: ['http://localhost:3009/api/v1/event-outbox/events'],
      NotificationFailed: ['http://localhost:3009/api/v1/event-outbox/events'],
      NotificationRead: ['http://localhost:3009/api/v1/event-outbox/events'],
    };

    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(outboxEventRepository, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();

    fastify.addHook('onClose', async () => {
      outboxWorker.stop();
    });

    fastify.get('/health', async () => {
      return { status: 'ok', service: 'notification-service', uptime: process.uptime() };
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Notification-Service] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
