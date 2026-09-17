import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-email', 'x-workspace-id'],
  });

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

  await fastify.register(rateLimit, {
    max: 1000, // higher limit since it's internal/downstream
    timeWindow: '15m',
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter: context.after,
    }),
  });

  fastify.log.info('Security plugins registered (CORS, Helmet, Rate Limit)');
};

export default fp(securityPlugin, {
  name: 'security-plugin',
});
