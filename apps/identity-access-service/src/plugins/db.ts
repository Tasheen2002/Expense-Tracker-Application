import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../generated/prisma-client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('prisma', prisma);
  fastify.log.info('Prisma client registered for identity-workspace');

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Identity database connection closed');
  });
};

export default fp(dbPlugin, {
  name: 'db-plugin',
});
export { prisma };
