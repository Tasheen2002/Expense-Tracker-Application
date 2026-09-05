import 'dotenv/config';
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { PrismaClient } from '@prisma/client';
import { container } from './container';
import { registerReceiptVaultRoutes } from './modules/receipt-vault/infrastructure/http/routes';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    user?: {
      id: string;
      userId: string;
      email: string;
      workspaceId?: string;
    };
  }
}

const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    ajv: {
      customOptions: {
        keywords: ['example'],
      },
    },
    logger:
      process.env.NODE_ENV === 'development'
        ? {
            level: process.env.LOG_LEVEL || 'info',
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
              },
            },
          }
        : {
            level: process.env.LOG_LEVEL || 'info',
          },
    schemaErrorFormatter: (errors, dataVar) => {
      const error = errors[0];
      let message = `${dataVar}${error.instancePath} ${error.message}`;
      if (error.params && 'missingProperty' in error.params) {
        message = `${dataVar} must have required property '${error.params.missingProperty}'`;
      }
      return new Error(message);
    },
  });

  // Global plugins
  await server.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Prisma Client Initialization
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  // Decorate server with local Prisma Client
  server.decorate('prisma', prisma);
  server.log.info('Database client registered');

  // Graceful database disconnection
  server.addHook('onClose', async () => {
    await prisma.$disconnect();
    server.log.info('Database connection closed');
  });

  // Security Context Authenticator (Gateway Integration)
  // Consumes validated context headers and strips pre-existing user metadata on req
  server.decorate('authenticate', async (request: FastifyRequest) => {
    const userId = request.headers['x-user-id'] as string;
    const email = request.headers['x-user-email'] as string;
    const workspaceId = request.headers['x-workspace-id'] as string;

    if (!userId) {
      const err = new Error('Authentication failed: Missing context headers from Gateway') as any;
      err.statusCode = 401;
      throw err;
    }

    request.user = {
      id: userId,
      userId,
      email: email || '',
      workspaceId,
    };
  });

  // Register container dependencies
  container.register(prisma);
  server.log.info('✓ DI Container initialized');

  // Register domain routes
  const receiptController = container.get<any>('receiptController');
  const tagController = container.get<any>('receiptTagController');

  await registerReceiptVaultRoutes(server, {
    receiptController,
    tagController,
  });
  server.log.info('✓ Receipt Vault routes registered');

  // Health Check
  server.get('/health', async () => {
    return { status: 'ok', service: 'receipt-vault-service', uptime: process.uptime() };
  });

  // Background Outbox Worker Integration
  const outboxEventRepository = container.get<any>('outboxEventRepository');
  
  // Set up event publisher (HTTP Webhooks downstream to subscribers)
  const webhookRoutes = {
    ReceiptUploaded: [process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003/api/v1/receipts/events'],
    ReceiptProcessed: [process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003/api/v1/receipts/events'],
    ReceiptLinkedToExpense: [process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003/api/v1/receipts/events'],
    ReceiptDeleted: [process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003/api/v1/receipts/events'],
  };
  const publisher = new HttpWebhookPublisher(webhookRoutes);

  const outboxWorker = new OutboxWorker(outboxEventRepository, publisher, {
    pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL || '5000', 10),
  });

  server.addHook('onReady', async () => {
    outboxWorker.start();
    server.log.info('✓ Outbox Worker background thread started');
  });

  server.addHook('onClose', async () => {
    outboxWorker.stop();
    server.log.info('Outbox Worker background thread stopped');
  });

  return server;
};

const start = async () => {
  try {
    const server = await createServer();
    const port = parseInt(process.env.PORT || '3007', 10);
    const host = '0.0.0.0';

    await server.listen({ port, host });
    server.log.info(`🚀 Receipt Vault Service running at http://localhost:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
