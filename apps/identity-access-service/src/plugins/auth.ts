import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types/fastify.d';
import { ISessionService } from '../modules/identity-workspace/application/services/session.service';

export interface AuthPluginOptions {
  sessionService: ISessionService;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('[Auth-Plugin] FATAL: JWT_SECRET environment variable is required but not set.');
  }
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!options.sessionService) {
    throw new Error('[Auth-Plugin] FATAL: sessionService must be provided via plugin options.');
  }
  const sessionService = options.sessionService;

  fastify.decorate('signToken', (payload: JWTPayload): string => {
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as string;
    return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions);
  });

  fastify.decorate('verifyToken', (token: string): JWTPayload => {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error: unknown) {
      const err = new Error('Invalid or expired token') as Error & {
        statusCode: number;
      };
      err.statusCode = 401;
      throw err;
    }
  });

  fastify.decorateRequest('user', null);

  /**
   * Strict user session authentication.
   * Required for all user-facing endpoints (/auth/me, /auth/logout, /workspaces, etc.).
   * Always parses Bearer token and validates session existence & activity in sessionService.
   * Never falls back to or bypasses via internal API key.
   */
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const err = new Error('Missing or invalid authorization header') as Error & {
          statusCode: number;
        };
        err.statusCode = 401;
        throw err;
      }

      const token = authHeader.substring(7);
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      if (!payload.sessionId) {
        const err = new Error('Invalid token: missing session identifier') as Error & {
          statusCode: number;
        };
        err.statusCode = 401;
        throw err;
      }

      const isValid = await sessionService.isSessionValid(payload.sessionId);
      if (!isValid) {
        const err = new Error('Session has been revoked or expired') as Error & {
          statusCode: number;
        };
        err.statusCode = 401;
        throw err;
      }

      request.user = payload;
    } catch (error: unknown) {
      const err = new Error(
        error instanceof Error ? error.message : 'Authentication failed'
      ) as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }
  });

  /**
   * Scoped service-principal or user authentication.
   * Used strictly on inter-service query endpoints (e.g. member lookup, user lookup)
   * where another trusted microservice may verify permissions either on behalf of a user
   * (with a Bearer token) or directly as a service principal (with x-internal-api-key).
   */
  fastify.decorate('authenticateServiceOrUser', async (request: FastifyRequest) => {
    // 1. If Bearer token is provided, prioritize strict user session authentication
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await fastify.authenticate(request);
      return;
    }

    // 2. Otherwise, check for trusted service-to-service internal API key
    const internalKey = process.env.INTERNAL_API_KEY;
    const incomingInternalKey = request.headers['x-internal-api-key'];

    if (
      internalKey &&
      typeof incomingInternalKey === 'string' &&
      incomingInternalKey.length > 0 &&
      incomingInternalKey === internalKey
    ) {
      const actorId =
        (request.headers['x-user-id'] as string) ||
        (request.headers['x-actor-id'] as string) ||
        'internal-service';
      const actorEmail =
        (request.headers['x-user-email'] as string) ||
        'internal-service@system.local';

      request.user = {
        userId: actorId,
        email: actorEmail,
        sessionId: 'service-principal',
        isServicePrincipal: true,
      };
      return;
    }

    // 3. Neither valid Bearer token nor valid internal key
    const err = new Error('Missing or invalid authorization header') as Error & {
      statusCode: number;
    };
    err.statusCode = 401;
    throw err;
  });

  fastify.log.info('Auth plugin registered for identity-workspace');
};

export default fp(authPlugin, {
  name: 'auth-plugin',
});
