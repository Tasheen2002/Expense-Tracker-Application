export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export interface WorkspaceMembershipContext {
  readonly userId: string;
  readonly workspaceId: string;
  readonly role: WorkspaceRole;
}

export interface AuthorizeWorkspaceInput {
  readonly userId: string;
  readonly workspaceId: string;
  readonly requiredRole?: WorkspaceRole;
  readonly authToken?: string;
}

export interface IWorkspaceAuthorizationPort {
  authorize(input: AuthorizeWorkspaceInput): Promise<WorkspaceMembershipContext>;
}
