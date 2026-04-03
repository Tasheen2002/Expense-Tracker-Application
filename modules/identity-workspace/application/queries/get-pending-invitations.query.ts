import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitation } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetPendingInvitationsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetPendingInvitationsHandler implements IQueryHandler<
  GetPendingInvitationsQuery,
  QueryResult<PaginatedResult<WorkspaceInvitation>>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetPendingInvitationsQuery
  ): Promise<QueryResult<PaginatedResult<WorkspaceInvitation>>> {
    try {
      const invitations = await this.invitationService.getPendingInvitations(
        query.workspaceId,
        query.options
      );
      return QueryResult.success(invitations);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
