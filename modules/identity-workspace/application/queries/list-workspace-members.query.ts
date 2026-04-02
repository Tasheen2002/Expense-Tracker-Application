import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { WorkspaceMembership } from '../../domain/entities/workspace-membership.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface ListWorkspaceMembersQuery extends IQuery {
  workspaceId: string;
}

export class ListWorkspaceMembersHandler implements IQueryHandler<
  ListWorkspaceMembersQuery,
  QueryResult<PaginatedResult<WorkspaceMembership>>
> {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  async handle(
    query: ListWorkspaceMembersQuery
  ): Promise<QueryResult<PaginatedResult<WorkspaceMembership>>> {
    try {
      const members = await this.membershipService.getWorkspaceMembers(
        query.workspaceId
      );
      return QueryResult.success(members);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
