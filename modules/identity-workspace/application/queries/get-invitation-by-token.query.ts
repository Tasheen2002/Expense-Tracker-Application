import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetInvitationByTokenQuery extends IQuery {
  token: string;
}

export class GetInvitationByTokenHandler implements IQueryHandler<
  GetInvitationByTokenQuery,
  QueryResult<WorkspaceInvitationDTO | null>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetInvitationByTokenQuery
  ): Promise<QueryResult<WorkspaceInvitationDTO | null>> {
    try {
      const invitationDTO = await this.invitationService.getInvitationDTOByToken(
        query.token
      );
      return QueryResult.success(invitationDTO);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
