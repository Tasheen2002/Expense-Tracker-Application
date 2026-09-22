import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../shared/infrastructure/persistence/prisma.client';

export interface DbPluginOptions {
  prisma?: PrismaClient;
}

const dbPlugin: FastifyPluginAsync<DbPluginOptions> = async (fastify, opts) => {
  const prisma =
    opts?.prisma ??
    new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });

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
