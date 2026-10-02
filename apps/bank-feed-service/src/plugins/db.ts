import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../prisma-client';

export interface DbPluginOptions {
  prisma?: PrismaClient;
  beforeDatabaseDisconnect?: () => Promise<void>;
}

const dbPlugin: FastifyPluginAsync<DbPluginOptions> = async (fastify, options) => {
  const prisma = options.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  fastify.decorate('prisma', prisma);
  fastify.log.info('Database client registered for bank-feed-service');

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
