import 'dotenv/config';
import Fastify from 'fastify';

import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerBankFeedSyncRoutes } from './modules/bank-feed-sync/infrastructure/http/routes';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3006', 10);

const start = async () => {
  try {
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    container.register(fastify.prisma);

    const bankFeedServices = container.getBankFeedServices();
    await registerBankFeedSyncRoutes(
      fastify as any,
      bankFeedServices,
      bankFeedServices.prisma
    );

    const outboxEventRepository = container.get<any>('outboxEventRepository');
    
    const webhookRoutes = {
      BankConnected: ['http://localhost:3009/api/v1/event-outbox/events'],
      BankDisconnected: ['http://localhost:3009/api/v1/event-outbox/events'],
      BankConnectionTokenUpdated: ['http://localhost:3009/api/v1/event-outbox/events'],
      BankConnectionDeleted: ['http://localhost:3009/api/v1/event-outbox/events'],
      SyncSessionStarted: ['http://localhost:3009/api/v1/event-outbox/events'],
      SyncSessionCompleted: ['http://localhost:3009/api/v1/event-outbox/events'],
      SyncSessionFailed: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      BankTransactionsSynced: ['http://localhost:3009/api/v1/event-outbox/events'],
      BankTransactionProcessed: ['http://localhost:3009/api/v1/event-outbox/events'],
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
      return { status: 'ok', service: 'bank-feed-service', uptime: process.uptime() };
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Bank-Feed-Service] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
