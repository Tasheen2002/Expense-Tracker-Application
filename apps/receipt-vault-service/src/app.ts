import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { PrismaClient } from '@prisma/client';
import { container } from './container';
import { registerReceiptVaultRoutes } from './modules/receipt-vault/infrastructure/http/routes';

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

/**
 * Creates and configures a Fastify server for the Receipt Vault Service.
 * Does NOT start listening or start the outbox worker — used by both
 * `index.ts` and integration tests.
 */
export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    ajv: {
      customOptions: { keywords: ['example'] },
    },
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : process.env.NODE_ENV === 'development'
        ? {
            level: process.env.LOG_LEVEL || 'info',
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname', colorize: true },
            },
          }
        : { level: process.env.LOG_LEVEL || 'info' },
    schemaErrorFormatter: (errors, dataVar) => {
      const error = errors[0];
      let message = `${dataVar}${error.instancePath} ${error.message}`;
      if (error.params && 'missingProperty' in error.params) {
        message = `${dataVar} must have required property '${error.params.missingProperty}'`;
      }
      return new Error(message);
    },
  });

  await server.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
  await server.register(helmet, { contentSecurityPolicy: false });

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  server.decorate('prisma', prisma);

  server.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  // Gateway-integrated auth via context headers
  server.decorate('authenticate', async (request: FastifyRequest) => {
    const userId = request.headers['x-user-id'] as string;
    const email = request.headers['x-user-email'] as string;
    const workspaceId = request.headers['x-workspace-id'] as string;

    if (!userId) {
      const err = new Error('Authentication failed: Missing context headers from Gateway') as any;
      err.statusCode = 401;
      throw err;
    }

    request.user = { id: userId, userId, email: email || '', workspaceId };
  });

  container.register(prisma);

  const receiptController = container.get<any>('receiptController');
  const tagController = container.get<any>('receiptTagController');

  await registerReceiptVaultRoutes(server, { receiptController, tagController });

  server.get('/health', async () => ({
    status: 'ok',
    service: 'receipt-vault-service',
    uptime: process.uptime(),
  }));

  return server;
};
