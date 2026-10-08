import { TemplateAccessDeniedError } from '../../domain/errors/notification.errors';
import { UserId, WorkspaceId } from '../../domain/value-objects';

/** Supplied by a trusted adapter after membership verification; never from a request body. */
export interface TemplateAccess {
  userId: string;
  workspaceId: string;
  role: string;
}

export function requireTemplateAccess(access: TemplateAccess, workspaceId?: string): WorkspaceId {
  if (!access || !['OWNER', 'ADMIN'].includes(access.role) || !workspaceId) {
    throw new TemplateAccessDeniedError();
  }
  UserId.fromString(access.userId);
  const workspace = WorkspaceId.fromString(workspaceId);
  if (!workspace.equals(WorkspaceId.fromString(access.workspaceId))) throw new TemplateAccessDeniedError();
  return workspace;
}
