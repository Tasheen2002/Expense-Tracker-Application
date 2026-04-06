import { WorkspaceManagementService } from '../services/workspace-management.service';
import { Workspace, WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetUserWorkspacesQuery extends IQuery {
  userId: string;
  options?: PaginationOptions;
}

export class GetUserWorkspacesHandler implements IQueryHandler<
  GetUserWorkspacesQuery,
  QueryResult<PaginatedResult<WorkspaceDTO>>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    query: GetUserWorkspacesQuery
  ): Promise<QueryResult<PaginatedResult<WorkspaceDTO>>> {
    const workspaces =
      await this.workspaceManagementService.getWorkspacesByMembership(
        query.userId,
        query.options
      );
    return QueryResult.success({
      items: workspaces.items.map((w: Workspace) => Workspace.toDTO(w)),
      total: workspaces.total,
      limit: workspaces.limit,
      offset: workspaces.offset,
      hasMore: workspaces.hasMore,
    });
  }
}
