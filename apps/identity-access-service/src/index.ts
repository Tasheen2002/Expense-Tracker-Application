import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import { container } from './container';
import { registerIdentityWorkspaceRoutes } from './modules/identity-workspace/infrastructure/http/routes/index';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { PrismaOutboxEventRepository } from './outbox/prisma-outbox.repository';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3002', 10);

fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

const start = async () => {
  try {
    // 1. Register local database and authentication plugins
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);

    // 2. Initialize DI container
    container.register(fastify.prisma);

    // 3. Register route handlers
    const identityServices = container.getIdentityWorkspaceServices();
    await registerIdentityWorkspaceRoutes(
      fastify as any,
      identityServices,
      identityServices.prisma
    );

    // 4. Start Outbox Worker
    const outboxRepo = new PrismaOutboxEventRepository(fastify.prisma);
    const webhookRoutes = {
      'UserCreated': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
        'http://localhost:3008/api/v1/event-outbox/events', // Notification
      ],
      'WorkspaceCreated': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
      ],
      'MemberJoinedWorkspace': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
      ],
      'MemberRoleChanged': [
        'http://localhost:3009/api/v1/event-outbox/events', // Audit
      ],
    };
    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(outboxRepo, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();

    // Graceful shutdown hooks
    fastify.addHook('onClose', async () => {
      outboxWorker.stop();
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Identity-Access-Service] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
