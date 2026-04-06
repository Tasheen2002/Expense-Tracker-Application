import { AllocationManagementService } from '../services/allocation-management.service';
import { Project, ProjectDTO } from '../../domain/entities/project.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetProjectQuery extends IQuery {
  id: string;
}

export class GetProjectHandler implements IQueryHandler<
  GetProjectQuery,
  QueryResult<ProjectDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetProjectQuery): Promise<QueryResult<ProjectDTO>> {
    const project = await this.allocationManagementService.getProject(query.id);
    return QueryResult.success(Project.toDTO(project));
  }
}
