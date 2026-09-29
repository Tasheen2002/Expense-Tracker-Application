/** Serializes expense approvals, spending projections, and limit changes per workspace. */
export interface IWorkspaceAccountingLock {
  acquire(workspaceId: string): Promise<void>;
}
