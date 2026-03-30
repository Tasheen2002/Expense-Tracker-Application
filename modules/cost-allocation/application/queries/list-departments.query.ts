import { AllocationManagementService } from '../services/allocation-management.service';
import { Department } from '../../domain/entities/department.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface ListDepartmentsQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListDepartmentsHandler implements IQueryHandler<
  ListDepartmentsQuery,
  QueryResult<PaginatedResult<Department>>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    query: ListDepartmentsQuery
  ): Promise<QueryResult<PaginatedResult<Department>>> {
    const result = await this.allocationManagementService.listDepartments(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
    return QueryResult.success(result);
  }
}
