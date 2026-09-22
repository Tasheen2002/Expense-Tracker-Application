import 'dotenv/config';
import Fastify from 'fastify';

import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerCategorizationRulesRoutes } from './modules/categorization-rules/infrastructure/http/routes';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3004', 10);

const start = async () => {
  try {
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    container.register(fastify.prisma);

    const categorizationServices = container.getCategorizationRulesServices();
    await registerCategorizationRulesRoutes(
      fastify as any,
      categorizationServices,
      categorizationServices.prisma
    );

    const outboxEventRepository = container.get<any>('outboxEventRepository');
    
    const webhookRoutes = {
      CategoryRuleCreated: ['http://localhost:3009/api/v1/event-outbox/events'],
      CategoryRuleActivated: ['http://localhost:3009/api/v1/event-outbox/events'],
      CategoryRuleDeactivated: ['http://localhost:3009/api/v1/event-outbox/events'],
      CategoryRuleUpdated: ['http://localhost:3009/api/v1/event-outbox/events'],
      CategoryRuleDeleted: ['http://localhost:3009/api/v1/event-outbox/events'],
      RuleExecuted: ['http://localhost:3009/api/v1/event-outbox/events'],
      CategorySuggestionCreated: ['http://localhost:3009/api/v1/event-outbox/events', 'http://localhost:3008/api/v1/event-outbox/events'],
      CategorySuggestionAccepted: ['http://localhost:3009/api/v1/event-outbox/events'],
      CategorySuggestionRejected: ['http://localhost:3009/api/v1/event-outbox/events'],
      CategorySuggestionDeleted: ['http://localhost:3009/api/v1/event-outbox/events'],
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
      return { status: 'ok', service: 'categorization-service', uptime: process.uptime() };
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Categorization-Service] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
