import 'fastify';
import { PrismaClient } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  workspaceId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }

  interface FastifyRequest {
    user?: JWTPayload;
  }
}
