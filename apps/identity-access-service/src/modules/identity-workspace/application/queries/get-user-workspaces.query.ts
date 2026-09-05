import { OperationService } from '../services/operation.service';
import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface GetUserWorkspacesQuery extends IQuery {
  readonly userId: string;
  readonly options?: PaginationOptions;
}

export class GetUserWorkspacesHandler implements IQueryHandler<
  GetUserWorkspacesQuery,
  PaginatedResult<WorkspaceDTO>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService,
    private readonly operations: OperationService
  ) {}

  async handle(
    query: GetUserWorkspacesQuery
  ): Promise<PaginatedResult<WorkspaceDTO>> {
    await this.operations.authorize({ actorId: query.userId });
    const result = await this.workspaceManagementService.getWorkspacesDTOByMembership(
      query.userId,
      query.options
    );
    return result;
  }
}
