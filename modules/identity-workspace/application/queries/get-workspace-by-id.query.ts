import { WorkspaceManagementService } from '../services/workspace-management.service';
import { Workspace } from '../../domain/entities/workspace.entity';
import { IQuery, IQueryHandler } from '../../../../apps/api/src/shared/application/cqrs';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

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
      return QueryResult.fromError(error);
    }
  }
}
