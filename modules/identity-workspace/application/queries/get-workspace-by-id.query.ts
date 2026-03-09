import { WorkspaceManagementService } from '../services/workspace-management.service';
import { Workspace } from '../../domain/entities/workspace.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetWorkspaceByIdQuery extends IQuery {
  workspaceId: string;
}

export class GetWorkspaceByIdHandler implements IQueryHandler<
  GetWorkspaceByIdQuery,
  QueryResult<Workspace | null>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    query: GetWorkspaceByIdQuery
  ): Promise<QueryResult<Workspace | null>> {
    try {
      const workspace = await this.workspaceManagementService.getWorkspaceById(
        query.workspaceId
      );
      return QueryResult.success(workspace);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : 'Failed to get workspace'
      );
    }
  }
}
