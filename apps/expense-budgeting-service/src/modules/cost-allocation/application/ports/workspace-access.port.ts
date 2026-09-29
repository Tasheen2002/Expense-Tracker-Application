export interface IWorkspaceAccessPort {
  /** Returns false for missing membership; throws when authorization cannot be checked. */
  isMember(userId: string, workspaceId: string): Promise<boolean>;
  /** Returns false for a known non-admin member or missing membership; throws when authorization cannot be checked. */
  isAdminOrOwner(userId: string, workspaceId: string): Promise<boolean>;
}
