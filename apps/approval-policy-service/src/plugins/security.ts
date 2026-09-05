import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  fastify.log.info('Security plugins registered (Helmet)');
};

export default fp(securityPlugin, {
  name: 'security-plugin',
});
