import { AllocationManagementService } from '../services/allocation-management.service';
import { Department } from '../../domain/entities/department.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetDepartmentQuery extends IQuery {
  id: string;
}

export class GetDepartmentHandler implements IQueryHandler<
  GetDepartmentQuery,
  QueryResult<Department>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetDepartmentQuery): Promise<QueryResult<Department>> {
    const department = await this.allocationManagementService.getDepartment(
      query.id
    );
    return QueryResult.success(department);
  }
}
