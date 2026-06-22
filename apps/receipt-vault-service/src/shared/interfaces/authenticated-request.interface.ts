import { FastifyRequest, RouteGenericInterface } from "fastify";

export interface AuthenticatedUser {
  id: string;
  userId: string; // Alias for compatibility
  email: string;
  workspaceId: string;
  // Add other properties attached by middleware
}

export interface AuthenticatedRequest<
  RouteGeneric extends RouteGenericInterface = any,
> extends FastifyRequest<RouteGeneric> {
  user: AuthenticatedUser;
}
