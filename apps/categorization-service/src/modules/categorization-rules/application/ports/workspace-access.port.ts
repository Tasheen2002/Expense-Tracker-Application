import { UserId, WorkspaceId } from '@core/domain/value-objects';

/** false means verified denial; dependency/configuration failures must reject. */
export interface IWorkspaceAccessPort {
  isMember(userId: UserId, workspaceId: WorkspaceId): Promise<boolean>;
  isAdminOrOwner(userId: UserId, workspaceId: WorkspaceId): Promise<boolean>;
}
