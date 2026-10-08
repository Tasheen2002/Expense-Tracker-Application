import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

const dbPlugin: FastifyPluginAsync<{ prismaFactory?: () => PrismaClient }> = async (fastify, options) => {
  const prisma = options.prismaFactory?.() ?? new PrismaClient();
  fastify.decorate('prisma', prisma);
  fastify.log.info('Database client registered for categorization-service');

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Database connection closed');
  });
  await prisma.$connect();
};

export default fp(dbPlugin, {
  name: 'db-plugin',
});
