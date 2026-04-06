import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitation, WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetUserInvitationsQuery extends IQuery {
  email: string;
}

export class GetUserInvitationsHandler implements IQueryHandler<
  GetUserInvitationsQuery,
  QueryResult<WorkspaceInvitationDTO[]>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetUserInvitationsQuery
  ): Promise<QueryResult<WorkspaceInvitationDTO[]>> {
    try {
      const invitations = await this.invitationService.getUserInvitations(
        query.email
      );
      return QueryResult.success(invitations.map((inv: WorkspaceInvitation) => WorkspaceInvitation.toDTO(inv)));
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
