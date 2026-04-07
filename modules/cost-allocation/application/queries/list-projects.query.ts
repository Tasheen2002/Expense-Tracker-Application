import { AllocationManagementService } from '../services/allocation-management.service';
import { ProjectDTO } from '../../domain/entities/project.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListProjectsQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListProjectsHandler implements IQueryHandler<
  ListProjectsQuery,
  QueryResult<PaginatedResult<ProjectDTO>>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    query: ListProjectsQuery
  ): Promise<QueryResult<PaginatedResult<ProjectDTO>>> {
    const result = await this.allocationManagementService.listProjects(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
    return QueryResult.success(result);
  }
}
