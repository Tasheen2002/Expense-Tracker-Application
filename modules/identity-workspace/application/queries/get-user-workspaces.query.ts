import { WorkspaceManagementService } from '../services/workspace-management.service';
import { Workspace } from '../../domain/entities/workspace.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface GetUserWorkspacesQuery extends IQuery {
  userId: string;
  options?: PaginationOptions;
}

export class GetUserWorkspacesHandler implements IQueryHandler<
  GetUserWorkspacesQuery,
  QueryResult<PaginatedResult<Workspace>>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    query: GetUserWorkspacesQuery
  ): Promise<QueryResult<PaginatedResult<Workspace>>> {
    // FIXED: Get ALL workspaces user is a member of, not just owned workspaces
    const workspaces =
      await this.workspaceManagementService.getWorkspacesByMembership(
        query.userId,
        query.options
      );
    return QueryResult.success(workspaces);
  }
}
