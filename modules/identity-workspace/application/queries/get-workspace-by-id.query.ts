import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface GetWorkspaceByIdQuery extends IQuery {
  readonly workspaceId: string;
}

export class GetWorkspaceByIdHandler implements IQueryHandler<
  GetWorkspaceByIdQuery,
  WorkspaceDTO | null
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    query: GetWorkspaceByIdQuery
  ): Promise<WorkspaceDTO | null> {
    const workspaceDTO = await this.workspaceManagementService.getWorkspaceDTOById(
      query.workspaceId
    );
    return workspaceDTO;
  }
}
