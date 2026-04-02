import { ScenarioService } from '../services/scenario.service';
import { Scenario } from '../../domain/entities/scenario.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListScenariosQuery extends IQuery {
  planId: string;
  userId: string;
}

export class ListScenariosHandler implements IQueryHandler<
  ListScenariosQuery,
  QueryResult<PaginatedResult<Scenario>>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(
    query: ListScenariosQuery
  ): Promise<QueryResult<PaginatedResult<Scenario>>> {
    const result = await this.scenarioService.listScenarios(
      query.planId,
      query.userId
    );
    return QueryResult.success(result);
  }
}
