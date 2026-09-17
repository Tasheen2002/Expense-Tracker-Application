import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';

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

    if (!userId) {
      const err = new Error('Unauthorized: Missing gateway context headers') as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    request.user = {
      userId: userId as string,
      email: (email || '') as string,
      workspaceId: workspaceId ? (workspaceId as string) : undefined,
    };
  });

  fastify.log.info('Context Authentication plugin registered');
};

export default fp(contextAuthPlugin, {
  name: 'auth-plugin',
});
