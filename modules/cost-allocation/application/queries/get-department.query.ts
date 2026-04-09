import { AllocationManagementService } from '../services/allocation-management.service';
import { DepartmentDTO } from '../../domain/entities/department.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface GetDepartmentQuery extends IQuery {
  id: string;
}

export class GetDepartmentHandler implements IQueryHandler<GetDepartmentQuery, DepartmentDTO> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetDepartmentQuery): Promise<DepartmentDTO> {
    return this.allocationManagementService.getDepartment(query.id);
  }
}
