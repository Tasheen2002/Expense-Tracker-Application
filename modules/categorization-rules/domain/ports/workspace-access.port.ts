import { UserId } from '../../../identity-workspace';
import { WorkspaceId } from '../../../identity-workspace';

export interface IWorkspaceAccessPort {
  isAdminOrOwner(userId: UserId, workspaceId: WorkspaceId): Promise<boolean>;
}
