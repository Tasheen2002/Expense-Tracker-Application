import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  workspaceId?: string;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me-for-ci-runs';

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
      (request as any).user = payload;
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
