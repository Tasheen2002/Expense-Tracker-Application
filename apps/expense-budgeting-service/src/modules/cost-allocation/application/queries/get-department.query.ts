import { AllocationManagementService } from '../services/allocation-management.service';
import { DepartmentDTO } from '../../domain/entities/department.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetDepartmentQuery extends IQuery {
  readonly id: string;
}

export class GetDepartmentHandler implements IQueryHandler<GetDepartmentQuery, DepartmentDTO> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetDepartmentQuery): Promise<DepartmentDTO> {
    return this.allocationManagementService.getDepartment(query.id);
  }
}
