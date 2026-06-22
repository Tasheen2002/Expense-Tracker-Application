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
    signToken: (payload: JWTPayload) => string;
    verifyToken: (token: string) => JWTPayload;
  }

  interface FastifyRequest {
    user?: JWTPayload;
  }
}
