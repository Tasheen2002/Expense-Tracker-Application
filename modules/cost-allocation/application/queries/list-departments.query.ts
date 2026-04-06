import { AllocationManagementService } from '../services/allocation-management.service';
import { Department, DepartmentDTO } from '../../domain/entities/department.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListDepartmentsQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListDepartmentsHandler implements IQueryHandler<
  ListDepartmentsQuery,
  QueryResult<PaginatedResult<DepartmentDTO>>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    query: ListDepartmentsQuery
  ): Promise<QueryResult<PaginatedResult<DepartmentDTO>>> {
    const result = await this.allocationManagementService.listDepartments(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
    return QueryResult.success({
      items: result.items.map(Department.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
