import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitation, WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetWorkspaceInvitationsQuery extends IQuery {
  workspaceId: string;
}

export class GetWorkspaceInvitationsHandler implements IQueryHandler<
  GetWorkspaceInvitationsQuery,
  QueryResult<WorkspaceInvitationDTO[]>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetWorkspaceInvitationsQuery
  ): Promise<QueryResult<WorkspaceInvitationDTO[]>> {
    try {
      const invitations = await this.invitationService.getWorkspaceInvitations(
        query.workspaceId
      );
      return QueryResult.success(invitations.map((inv: WorkspaceInvitation) => WorkspaceInvitation.toDTO(inv)));
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
