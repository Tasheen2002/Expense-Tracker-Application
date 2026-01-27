import { FastifyRequest, FastifyReply } from "fastify";

/**
 * Role-based authorization middleware factory
 *
 * Use this AFTER workspace-authorization.middleware to enforce role-specific permissions.
 *
 * @param allowedRoles - Array of roles that can access this endpoint
 * @returns Fastify preHandler function
 *
 * @example
 * // Only OWNER and ADMIN can delete workspaces
 * fastify.delete('/:workspaceId', {
 *   preHandler: requireRole(['OWNER', 'ADMIN'])
 * }, deleteWorkspaceHandler)
 *
 * @example
 * // Only OWNER can transfer ownership
 * fastify.post('/:workspaceId/transfer', {
 *   preHandler: requireRole(['OWNER'])
 * }, transferOwnershipHandler)
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Ensure workspace authorization middleware ran first
    if (!request.workspaceMembership) {
      return reply.status(500).send({
        success: false,
        statusCode: 500,
        message: "Internal error: Workspace membership not found. Ensure workspace-authorization middleware runs first.",
      });
    }

    const userRole = request.workspaceMembership.role;

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(userRole)) {
      return reply.status(403).send({
        success: false,
        statusCode: 403,
        message: `Access denied: This action requires one of the following roles: ${allowedRoles.join(", ")}. Your role: ${userRole}`,
      });
    }

    // User has required role, continue to handler
  };
}

/**
 * Common role combinations for convenience
 */
export const RolePermissions = {
  // Only workspace owner
  OWNER_ONLY: requireRole(["OWNER"]),

  // Owner or Admin
  ADMIN_LEVEL: requireRole(["OWNER", "ADMIN"]),

  // Owner, Admin, or Manager
  MANAGER_LEVEL: requireRole(["OWNER", "ADMIN", "MANAGER"]),

  // Any workspace member (already checked by workspace-authorization middleware)
  MEMBER_LEVEL: requireRole(["OWNER", "ADMIN", "MANAGER", "MEMBER"]),
};

/**
 * Helper to check if user has permission (use in controllers)
 */
export function hasRole(request: FastifyRequest, allowedRoles: string[]): boolean {
  const userRole = request.workspaceMembership?.role;
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
