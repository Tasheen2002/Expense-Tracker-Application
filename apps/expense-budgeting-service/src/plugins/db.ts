import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  // Each app owns its pool and can close it without affecting another app.
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  // Decorate Fastify instance with Prisma client
  fastify.decorate('prisma', prisma);

  // Log database connection
  fastify.log.info('Database client registered for expense-budgeting-service');

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Database connection closed');
  });
};

export default fp(dbPlugin, {
  name: 'db-plugin',
});
