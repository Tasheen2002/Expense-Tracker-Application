import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitation } from '../../domain/entities/workspace-invitation.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetInvitationByTokenQuery extends IQuery {
  token: string;
}

export class GetInvitationByTokenHandler implements IQueryHandler<
  GetInvitationByTokenQuery,
  QueryResult<WorkspaceInvitation | null>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetInvitationByTokenQuery
  ): Promise<QueryResult<WorkspaceInvitation | null>> {
    try {
      const invitation = await this.invitationService.getInvitationByToken(
        query.token
      );
      return QueryResult.success(invitation);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
