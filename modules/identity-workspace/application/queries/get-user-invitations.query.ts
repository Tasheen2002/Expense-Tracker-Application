import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
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
      const dtos = await this.invitationService.getUserInvitationDTOs(query.email);
      return QueryResult.success(dtos);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
