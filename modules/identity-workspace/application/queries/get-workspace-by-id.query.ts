import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetWorkspaceByIdQuery extends IQuery {
  workspaceId: string;
}

export class GetWorkspaceByIdHandler implements IQueryHandler<
  GetWorkspaceByIdQuery,
  QueryResult<WorkspaceDTO | null>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    query: GetWorkspaceByIdQuery
  ): Promise<QueryResult<WorkspaceDTO | null>> {
    try {
      const workspaceDTO = await this.workspaceManagementService.getWorkspaceDTOById(
        query.workspaceId
      );
      return QueryResult.success(workspaceDTO);
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
