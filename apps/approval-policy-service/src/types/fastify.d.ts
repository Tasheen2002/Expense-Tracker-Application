import 'fastify';
import type { PrismaClient } from '../shared/infrastructure/persistence/prisma.client';
import type { CompositionRoot } from '../composition-root';

export interface JWTPayload {
  userId: string;
  email: string;
  workspaceId?: string;
  role?: string;
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

  interface FastifySchema {
    tags?: readonly string[] | string[];
    description?: string;
    security?: readonly Array<Record<string, readonly string[] | string[]>> | Array<Record<string, string[]>>;
  }
}
