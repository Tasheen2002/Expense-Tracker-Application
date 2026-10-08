import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_HEADER = 'x-correlation-id';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

/**
 * Fastify plugin that ensures every request has a correlation ID.
 *
 * Behaviour:
 * 1. Reads `x-correlation-id` from incoming request headers.
 * 2. If absent, generates a new UUID v4.
 * 3. Attaches it to `request.correlationId` for application code access.
 * 4. Adds it to pino logger's child bindings so every log line includes it.
 * 5. Includes it in the response headers for client-side tracing.
 */
const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('correlationId', '');

  fastify.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers[CORRELATION_HEADER];
    const correlationId = (typeof incoming === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(incoming))
      ? incoming
      : uuidv4();

    request.correlationId = correlationId;

    // Enrich pino logger with correlation context for structured logging
    request.log = request.log.child({ correlationId });

    // Echo correlation ID back in response headers
    reply.header(CORRELATION_HEADER, correlationId);
  });

  fastify.log.info('Correlation ID plugin registered');
};

export const correlationPlugin = fp(plugin, {
  name: 'correlation-plugin',
});
