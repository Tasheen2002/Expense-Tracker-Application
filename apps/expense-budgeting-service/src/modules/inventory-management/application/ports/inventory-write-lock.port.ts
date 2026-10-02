/** Serializes inventory writes within a workspace for the current transaction. */
export interface IInventoryWriteLock {
  acquire(workspaceId: string): Promise<void>;
}
