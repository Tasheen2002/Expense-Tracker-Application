/**
 * Workspace Role Enum
 */
export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

/**
 * Check if a role has higher privilege than another
 */
export function hasHigherPrivilege(role1: WorkspaceRole, role2: WorkspaceRole): boolean {
  const hierarchy = {
    [WorkspaceRole.OWNER]: 3,
    [WorkspaceRole.ADMIN]: 2,
    [WorkspaceRole.MEMBER]: 1,
  }

  return hierarchy[role1] > hierarchy[role2]
}

/**
 * Check if a role can perform an operation requiring a minimum role
 */
export function canPerformOperation(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  const hierarchy = {
    [WorkspaceRole.OWNER]: 3,
    [WorkspaceRole.ADMIN]: 2,
    [WorkspaceRole.MEMBER]: 1,
  }

  return hierarchy[userRole] >= hierarchy[requiredRole]
}
