import 'fastify';
import { PrismaClient } from '../prisma-client';
import { CompositionRoot } from '../composition-root';

export interface JWTPayload {
  userId: string;
  email: string;
  workspaceId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    compositionRoot: CompositionRoot;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }

  interface FastifyRequest {
    user?: JWTPayload;
  }
}
