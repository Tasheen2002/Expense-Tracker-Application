import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';

export interface UserContext {
  userId: string;
  email: string;
  workspaceId?: string;
  isServicePrincipal?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    user?: UserContext;
    servicePrincipal?: string;
  }
}

const contextAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('servicePrincipal', undefined);

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    const userId = request.headers['x-user-id'];
    const email = request.headers['x-user-email'];
    const workspaceId = request.headers['x-workspace-id'];
    const rawSp = request.headers['x-service-principal'] as string | undefined;
    const internalApiKey = request.headers['x-internal-api-key'] as string | undefined;
    const expectedKey = process.env.INTERNAL_API_KEY;

    // A service principal is strictly trusted only with a valid internal API key (or explicit dev bypass)
    const allowInsecureDev =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_INSECURE_INTERNAL_AUTH === 'true';

    const isVerifiedInternal =
      Boolean(rawSp) &&
      !userId &&
      ((Boolean(expectedKey) && internalApiKey === expectedKey) || (allowInsecureDev && Boolean(rawSp)));

    if (isVerifiedInternal) {
      request.servicePrincipal = rawSp;
      request.user = {
        userId: rawSp!,
        email: `${rawSp}@system.local`,
        workspaceId: workspaceId ? (workspaceId as string) : undefined,
        isServicePrincipal: true,
      };
      return;
    }

    if (!userId) {
      const err = new Error(
        'Unauthorized: Missing gateway context headers or valid internal service authentication'
      ) as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    // For interactive user requests, ignore any self-asserted x-service-principal header
    request.servicePrincipal = undefined;
    request.user = {
      userId: userId as string,
      email: (email || '') as string,
      workspaceId: workspaceId ? (workspaceId as string) : undefined,
      isServicePrincipal: false,
    };
  });

  fastify.log.info('Context Authentication plugin registered');
};

export default fp(contextAuthPlugin, {
  name: 'auth-plugin',
});
