import { AllocationManagementService } from '../services/allocation-management.service';
import { Department, DepartmentDTO } from '../../domain/entities/department.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetDepartmentQuery extends IQuery {
  id: string;
}

export class GetDepartmentHandler implements IQueryHandler<
  GetDepartmentQuery,
  QueryResult<DepartmentDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetDepartmentQuery): Promise<QueryResult<DepartmentDTO>> {
    const department = await this.allocationManagementService.getDepartment(
      query.id
    );
    return QueryResult.success(Department.toDTO(department));
  }
}
