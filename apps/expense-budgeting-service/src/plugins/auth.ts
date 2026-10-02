import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { DefaultServiceAuthenticationService } from '../shared/services/service-authentication.service';
import { IServiceAuthenticationPort } from '../shared/ports/service-authentication.port';

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

export interface ContextAuthPluginOptions {
  serviceAuthService?: IServiceAuthenticationPort;
}

const contextAuthPlugin: FastifyPluginAsync<ContextAuthPluginOptions> = async (fastify, opts) => {
  const serviceAuthService =
    opts?.serviceAuthService ?? new DefaultServiceAuthenticationService();

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    const userId = request.headers['x-user-id'];
    const email = request.headers['x-user-email'];
    const workspaceId = request.headers['x-workspace-id'];
    const rawSp = request.headers['x-service-principal'] as string | undefined;
    const internalApiKey =
      (request.headers['x-internal-api-key'] as string | undefined) ||
      (request.headers['x-cron-secret'] as string | undefined);

    const spCandidate = rawSp || (internalApiKey ? 'internal-service' : undefined);

    if (spCandidate && !userId) {
      const isVerified = await serviceAuthService.verifyService(spCandidate, { internalApiKey });
      if (isVerified) {
        request.servicePrincipal = spCandidate;
        request.user = {
          userId: spCandidate,
          email: `${spCandidate}@system.local`,
          workspaceId: workspaceId ? (workspaceId as string) : undefined,
          isServicePrincipal: true,
        };
        return;
      }
    }

    if (!userId) {
      const err = new Error(
        'Unauthorized: Missing gateway context headers or valid internal service authentication'
      ) as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

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
