import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

export interface UserContext {
  userId: string;
  email: string;
  workspaceId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    user?: UserContext;
  }
}

const contextAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    const userId = request.headers['x-user-id'];
    const email = request.headers['x-user-email'];
    const workspaceId = request.headers['x-workspace-id'];

    const parsed = z.object({ userId: z.string().uuid(), email: z.string(), workspaceId: z.string().uuid().optional() })
      .safeParse({ userId, email: email ?? '', workspaceId });
    if (!parsed.success) {
      const err = new Error('Unauthorized: Missing gateway context headers') as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    request.user = parsed.data;
  });

  fastify.log.info('Context Authentication plugin registered');
};

export default fp(contextAuthPlugin, {
  name: 'auth-plugin',
});
