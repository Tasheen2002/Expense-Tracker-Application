import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitation } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '../../../../apps/api/src/shared/application/cqrs';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface GetWorkspaceInvitationsQuery extends IQuery {
  workspaceId: string;
}

export class GetWorkspaceInvitationsHandler implements IQueryHandler<
  GetWorkspaceInvitationsQuery,
  QueryResult<WorkspaceInvitation[]>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetWorkspaceInvitationsQuery
  ): Promise<QueryResult<WorkspaceInvitation[]>> {
    try {
      const invitations = await this.invitationService.getWorkspaceInvitations(
        query.workspaceId
      );
      return QueryResult.success(invitations);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
