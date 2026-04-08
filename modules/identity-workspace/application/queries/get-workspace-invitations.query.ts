import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
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
      const dtos = await this.invitationService.getWorkspaceInvitationDTOs(query.workspaceId);
      return QueryResult.success(dtos);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
