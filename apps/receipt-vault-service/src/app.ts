import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import helmet from '@fastify/helmet';
import { PrismaClient } from '@prisma/client';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { z } from 'zod';
import { createCompositionRoot, CompositionRoot } from './composition-root';
import errorPlugin from './plugins/error';
import { registerReceiptVaultRoutes } from './modules/receipt-vault/infrastructure/http/routes';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient; compositionRoot: CompositionRoot;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    user?: { id: string; userId: string; email: string; workspaceId?: string };
  }
}
export interface ReceiptVaultAppOptions {
  enableInternalAuth?: boolean; logger?: boolean | object;
  prismaFactory?: () => PrismaClient;
  compositionRootFactory?: (prisma: PrismaClient) => CompositionRoot;
}

export async function buildReceiptVaultApp(options: ReceiptVaultAppOptions = {}): Promise<FastifyInstance> {
  if (process.env.NODE_ENV === 'production') {
    if (options.enableInternalAuth === false) throw new Error('Internal authentication cannot be disabled in production');
    if (!process.env.INTERNAL_API_KEY?.trim()) throw new Error('INTERNAL_API_KEY is required');
  }
  const server = Fastify({
    ajv: { customOptions: { keywords: ['example'] } },
    logger: options.logger ?? (process.env.NODE_ENV === 'test' ? false : true),
  });
  try {
    await server.register(correlationPlugin);
    if (options.enableInternalAuth !== false) {
      await server.register(internalAuthPlugin);
    }
    await server.register(helmet, { contentSecurityPolicy: false });
    await server.register(errorPlugin);
    const prisma = options.prismaFactory?.() ?? new PrismaClient();
    server.decorate('prisma', prisma);
    server.addHook('onClose', async () => { await prisma.$disconnect(); });
    await prisma.$connect();
    server.decorate('authenticate', async (request: FastifyRequest) => {
      const value = z.object({ userId: z.string().uuid(), email: z.string(), workspaceId: z.string().uuid().optional() })
        .safeParse({ userId: request.headers['x-user-id'], email: request.headers['x-user-email'] ?? '', workspaceId: request.headers['x-workspace-id'] });
      if (!value.success) throw Object.assign(new Error('Invalid gateway authentication context'), { statusCode: 401 });
      request.user = { ...value.data, id: value.data.userId };
    });
    const root = (options.compositionRootFactory ?? createCompositionRoot)(prisma);
    server.decorate('compositionRoot', root);
    await registerReceiptVaultRoutes(server, root);
    server.get('/health', async (_request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'ok', service: 'receipt-vault-service', database: 'connected' };
      } catch (error) {
        server.log.error(error, 'Database health check failed');
        return reply.code(503).send({ status: 'degraded', service: 'receipt-vault-service', error: 'Database service unavailable' });
      }
    });
    return server;
  } catch (error) {
    await server.close().catch(closeError => server.log.error(closeError, 'Startup cleanup failed'));
    throw error;
  }
}
export const createServer = () => buildReceiptVaultApp({ enableInternalAuth: false, logger: false });
