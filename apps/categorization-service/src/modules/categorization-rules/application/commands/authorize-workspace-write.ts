import { UserId, WorkspaceId } from '@core/domain/value-objects';
import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { UnauthorizedCategorizationAccessError } from '../../domain/errors/categorization-rules.errors';

export async function authorizeWorkspaceWrite(
  userId: string,
  workspaceId: WorkspaceId,
  workspaceAccess: IWorkspaceAccessPort,
): Promise<void> {
  if (!await workspaceAccess.isAdminOrOwner(UserId.fromString(userId), workspaceId)) {
    throw new UnauthorizedCategorizationAccessError();
  }
}
