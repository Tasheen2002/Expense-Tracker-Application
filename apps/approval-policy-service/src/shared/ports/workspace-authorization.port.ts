/**
 * Workspace Authorization Port
 *
 * Defines the contract for validating user membership and permissions within a workspace.
 * The Approval Policy service does NOT own workspace membership data (owned by identity-access-service).
 * Direct database access to the Identity database is strictly prohibited.
 */

export interface WorkspaceMembershipContext {
  userId: string;
  workspaceId: string;
  role: string;
}

export interface IWorkspaceAuthorizationService {
  /**
   * Authorizes that a user is an active member of the specified workspace,
   * optionally verifying that the user holds a required role or permission.
   *
   * @throws UnauthorizedWorkspaceAccessError if user is not a member or lacks required role.
   */
  authorize(input: {
    userId: string;
    workspaceId: string;
    requiredRole?: string;
    authToken?: string;
  }): Promise<WorkspaceMembershipContext>;
}
