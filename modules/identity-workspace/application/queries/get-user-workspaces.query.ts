import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
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
  PaginatedResult<WorkspaceDTO>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    query: GetUserWorkspacesQuery
  ): Promise<PaginatedResult<WorkspaceDTO>> {
    const result = await this.workspaceManagementService.getWorkspacesDTOByMembership(
      query.userId,
      query.options
    );
    return result;
  }
}
