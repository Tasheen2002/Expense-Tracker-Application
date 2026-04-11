import { AllocationManagementService } from '../services/allocation-management.service';
import { ProjectDTO } from '../../domain/entities/project.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface GetProjectQuery extends IQuery {
  id: string;
}

export class GetProjectHandler implements IQueryHandler<GetProjectQuery, ProjectDTO> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetProjectQuery): Promise<ProjectDTO> {
    return this.allocationManagementService.getProject(query.id);
  }
}
