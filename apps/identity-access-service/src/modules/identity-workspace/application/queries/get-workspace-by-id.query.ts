import { OperationService } from '../services/operation.service';
import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetWorkspaceByIdQuery extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
}

export class GetWorkspaceByIdHandler implements IQueryHandler<
  GetWorkspaceByIdQuery,
  WorkspaceDTO
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService,
    private readonly operations: OperationService
  ) {}

  async handle(
    query: GetWorkspaceByIdQuery
  ): Promise<WorkspaceDTO> {
    await this.operations.authorize({ actorId: query.actorId, workspaceId: query.workspaceId });
    const workspaceDTO = await this.workspaceManagementService.getWorkspaceDTOById(
      query.workspaceId
    );
    return workspaceDTO;
  }
}
