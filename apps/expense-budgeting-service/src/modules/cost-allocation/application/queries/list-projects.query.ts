import { AllocationManagementService } from '../services/allocation-management.service';
import { ProjectDTO } from '../../domain/entities/project.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface ListProjectsQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListProjectsHandler implements IQueryHandler<ListProjectsQuery, PaginatedResult<ProjectDTO>> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: ListProjectsQuery): Promise<PaginatedResult<ProjectDTO>> {
    return this.allocationManagementService.listProjects(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
  }
}
