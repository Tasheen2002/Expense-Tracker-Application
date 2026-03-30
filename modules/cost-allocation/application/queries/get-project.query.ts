import { AllocationManagementService } from '../services/allocation-management.service';
import { Project } from '../../domain/entities/project.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetProjectQuery extends IQuery {
  id: string;
}

export class GetProjectHandler implements IQueryHandler<
  GetProjectQuery,
  QueryResult<Project>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetProjectQuery): Promise<QueryResult<Project>> {
    const project = await this.allocationManagementService.getProject(query.id);
    return QueryResult.success(project);
  }
}
