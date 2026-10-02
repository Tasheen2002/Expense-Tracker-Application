import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

export interface DbPluginOptions {
  prisma?: PrismaClient;
  beforeDatabaseDisconnect?: () => Promise<void>;
}

const dbPlugin: FastifyPluginAsync<DbPluginOptions> = async (fastify, options) => {
  // Each app owns its pool and can close it without affecting another app.
  const prisma = options.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  // Decorate Fastify instance with Prisma client
  fastify.decorate('prisma', prisma);

  // Log database connection
  fastify.log.info('Database client registered for expense-budgeting-service');

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    try {
      await options.beforeDatabaseDisconnect?.();
    } finally {
      await prisma.$disconnect();
    }
    fastify.log.info('Database connection closed');
  });
};

export default fp(dbPlugin, {
  name: 'db-plugin',
});
