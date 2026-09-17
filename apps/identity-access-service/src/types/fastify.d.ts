import 'fastify';
import type { PrismaClient } from '../shared/infrastructure/persistence/prisma.client';

export interface JWTPayload {
  userId: string;
  email: string;
  workspaceId?: string;
  sessionId?: string;
  isServicePrincipal?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest) => Promise<void>;
    authenticateServiceOrUser: (request: FastifyRequest) => Promise<void>;
    signToken: (payload: JWTPayload) => string;
    verifyToken: (token: string) => JWTPayload;
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
