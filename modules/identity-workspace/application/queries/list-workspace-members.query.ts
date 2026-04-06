import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { WorkspaceMembership, WorkspaceMembershipDTO } from '../../domain/entities/workspace-membership.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListWorkspaceMembersQuery extends IQuery {
  workspaceId: string;
}

export class ListWorkspaceMembersHandler implements IQueryHandler<
  ListWorkspaceMembersQuery,
  QueryResult<PaginatedResult<WorkspaceMembershipDTO>>
> {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  async handle(
    query: ListWorkspaceMembersQuery
  ): Promise<QueryResult<PaginatedResult<WorkspaceMembershipDTO>>> {
    try {
      const members = await this.membershipService.getWorkspaceMembers(
        query.workspaceId
      );
      return QueryResult.success({
        items: members.items.map((m: WorkspaceMembership) => WorkspaceMembership.toDTO(m)),
        total: members.total,
        limit: members.limit,
        offset: members.offset,
        hasMore: members.hasMore,
      });
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
