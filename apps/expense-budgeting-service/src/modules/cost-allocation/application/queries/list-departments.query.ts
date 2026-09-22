import { AllocationManagementService } from '../services/allocation-management.service';
import { DepartmentDTO } from '../../domain/entities/department.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface ListDepartmentsQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListDepartmentsHandler implements IQueryHandler<ListDepartmentsQuery, PaginatedResult<DepartmentDTO>> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: ListDepartmentsQuery): Promise<PaginatedResult<DepartmentDTO>> {
    return this.allocationManagementService.listDepartments(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
  }
}
