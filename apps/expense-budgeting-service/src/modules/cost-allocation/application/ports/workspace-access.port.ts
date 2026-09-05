export interface IWorkspaceAccessPort {
  isAdminOrOwner(userId: string, workspaceId: string): Promise<boolean>;
}
