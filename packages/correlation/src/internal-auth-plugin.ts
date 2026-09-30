import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

export interface InternalAuthOptions {
  apiKey?: string;
  exemptPaths?: string[];
}

/**
 * Fastify plugin to enforce internal service-to-service authentication.
 *
 * Rules:
 * 1. Health check paths (/health, etc.) are always exempt.
 * 2. If INTERNAL_API_KEY is not set (e.g. in test envs), requests pass through.
 * 3. If INTERNAL_API_KEY is set, incoming requests must have a matching `x-internal-api-key`.
 */
const plugin: FastifyPluginAsync<InternalAuthOptions> = async (fastify, opts) => {
  const expectedKey = opts?.apiKey || process.env.INTERNAL_API_KEY;
  const exemptPaths = opts?.exemptPaths || ['/health'];

  fastify.addHook('onRequest', async (request, reply) => {
    const urlPath = request.url.split('?')[0];

    // Check if the path is exempt (e.g. health check)
    if (exemptPaths.some((exempt) => urlPath === exempt || urlPath.startsWith(`${exempt}/`))) {
      return;
    }

    // If no key is configured in the environment, do not fail open automatically
    if (!expectedKey) {
      if (process.env.NODE_ENV === 'production') {
        request.log.error('INTERNAL_API_KEY is not configured in production; failing closed.');
        return reply.code(500).send({
          success: false,
          statusCode: 500,
          error: 'ConfigurationError',
          message: 'Internal service authentication is not configured in production',
        });
      }

      // Explicit development bypass flag required when key is not set
      if (process.env.ALLOW_INSECURE_INTERNAL_AUTH === 'true') {
        return;
      }

      return reply.code(403).send({
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden: Internal authentication requires INTERNAL_API_KEY or explicit ALLOW_INSECURE_INTERNAL_AUTH',
      });
    }

    const providedKey = request.headers[INTERNAL_API_KEY_HEADER];
    if (!providedKey || providedKey !== expectedKey) {
      request.log.warn(
        { url: request.url, method: request.method },
        'Forbidden: Missing or invalid internal API key'
      );
      return reply.code(403).send({
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden: Invalid or missing internal API key',
      });
    }
  });

  fastify.log.info('Internal API Key Auth plugin registered');
};

export const internalAuthPlugin = fp(plugin, {
  name: 'internal-auth-plugin',
});
