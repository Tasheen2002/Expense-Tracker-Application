import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitation } from '../../domain/entities/workspace-invitation.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetUserInvitationsQuery extends IQuery {
  email: string;
}

export class GetUserInvitationsHandler implements IQueryHandler<
  GetUserInvitationsQuery,
  QueryResult<WorkspaceInvitation[]>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetUserInvitationsQuery
  ): Promise<QueryResult<WorkspaceInvitation[]>> {
    try {
      const invitations = await this.invitationService.getUserInvitations(
        query.email
      );
      return QueryResult.success(invitations);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error
          ? error.message
          : 'Failed to get user invitations'
      );
    }
  }
}
