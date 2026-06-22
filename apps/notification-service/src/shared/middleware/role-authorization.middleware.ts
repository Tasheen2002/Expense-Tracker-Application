import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Ensure workspace authorization middleware ran first
    if (!request.workspaceMembership) {
      return reply.status(500).send({
        success: false,
        statusCode: 500,
        message:
          'Internal error: Workspace membership not found. Ensure workspace-authorization middleware runs first.',
      });
    }

    const userRole = request.workspaceMembership.role.toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

    // Check if user's role is in the allowed roles
    if (!normalizedAllowedRoles.includes(userRole)) {
      return reply.status(403).send({
        success: false,
        statusCode: 403,
        message: `Access denied: This action requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${request.workspaceMembership.role}`,
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
  OWNER_ONLY: requireRole(['OWNER']),

  // Owner or Admin
  ADMIN_LEVEL: requireRole(['OWNER', 'ADMIN']),

  // Owner, Admin, or Manager
  MANAGER_LEVEL: requireRole(['OWNER', 'ADMIN', 'MANAGER']),

  // Any workspace member (already checked by workspace-authorization middleware)
  MEMBER_LEVEL: requireRole(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']),
};

/**
 * Helper to check if user has permission (use in controllers)
 */
export function hasRole(
  request: FastifyRequest,
  allowedRoles: string[]
): boolean {
  const userRole = request.workspaceMembership?.role?.toLowerCase();
  if (!userRole) return false;
  return allowedRoles.map(role => role.toLowerCase()).includes(userRole);
}
