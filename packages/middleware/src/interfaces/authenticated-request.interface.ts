import { FastifyRequest, RouteGenericInterface } from 'fastify';

export interface AuthenticatedUser {
  id: string;
  userId: string; // Alias for compatibility
  email: string;
  workspaceId?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest<
  RouteGeneric extends RouteGenericInterface = any,
> extends FastifyRequest<RouteGeneric> {
  user: AuthenticatedUser;
}

declare module 'fastify' {
  interface FastifyRequest {
    workspaceMembership?: {
      role: string;
      workspaceId: string;
    };
  }
}
