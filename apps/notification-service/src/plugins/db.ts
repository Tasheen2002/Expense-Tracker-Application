import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../prisma-client';

const dbPlugin: FastifyPluginAsync<{ prisma?: PrismaClient }> = async (fastify, options) => {
  const prisma = options.prisma ?? new PrismaClient({ log: ['error'] });
  fastify.decorate('prisma', prisma);
  fastify.log.info('Database client registered for notification-service');

  // The app owns shutdown: workers must drain before this client disconnects.
};

export default fp(dbPlugin, {
  name: 'db-plugin',
});
