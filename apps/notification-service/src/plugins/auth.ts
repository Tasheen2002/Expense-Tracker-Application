import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { UserId, WorkspaceId } from '@core/domain/value-objects';

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

    if (typeof userId !== 'string' || !UserId.isValid(userId)) {
      const err = new Error('Unauthorized: Valid gateway user context is required') as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    if ((email !== undefined && typeof email !== 'string')
      || (workspaceId !== undefined && (typeof workspaceId !== 'string' || !WorkspaceId.isValid(workspaceId)))) {
      throw Object.assign(new Error('Unauthorized: Invalid gateway context headers'), { statusCode: 401 });
    }

    request.user = {
      userId: userId.toLowerCase(),
      email: email ?? '',
      workspaceId: workspaceId?.toLowerCase(),
    };
  });

  fastify.log.info('Context Authentication plugin registered');
};

export default fp(contextAuthPlugin, {
  name: 'auth-plugin',
});
