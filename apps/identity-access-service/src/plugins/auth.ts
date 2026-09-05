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

  fastify.log.info('Auth plugin registered for identity-workspace');
};

export default fp(authPlugin, {
  name: 'auth-plugin',
});
