import { UserId, WorkspaceId } from '@core/domain/value-objects';
import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { UnauthorizedCategorizationReadError } from '../../domain/errors/categorization-rules.errors';

export async function authorizeWorkspaceRead(userId: string, workspaceId: WorkspaceId, access: IWorkspaceAccessPort): Promise<void> {
  if (!await access.isMember(UserId.fromString(userId), workspaceId)) {
    throw new UnauthorizedCategorizationReadError();
  }
}
