import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
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
  QueryResult<PaginatedResult<WorkspaceInvitationDTO>>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetPendingInvitationsQuery
  ): Promise<QueryResult<PaginatedResult<WorkspaceInvitationDTO>>> {
    try {
      const result = await this.invitationService.getPendingInvitationDTOs(
        query.workspaceId,
        query.options
      );
      return QueryResult.success(result);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
