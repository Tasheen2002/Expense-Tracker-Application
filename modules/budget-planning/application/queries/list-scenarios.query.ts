import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListScenariosQuery extends IQuery {
  planId: string;
  workspaceId: string;
  userId: string;
}

export class ListScenariosHandler implements IQueryHandler<
  ListScenariosQuery,
  QueryResult<PaginatedResult<ScenarioDTO>>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(
    query: ListScenariosQuery
  ): Promise<QueryResult<PaginatedResult<ScenarioDTO>>> {
    const result = await this.scenarioService.getScenariosByPlan(
      query.planId,
      query.workspaceId,
    );
    return QueryResult.success(result);
  }
}
