import { ScenarioRepository } from '../../domain/repositories/scenario.repository';
import { Scenario, ScenarioDTO } from '../../domain/entities/scenario.entity';
import { PlanId } from '../../domain/value-objects/plan-id';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
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
  QueryResult<PaginatedResult<ScenarioDTO>>
> {
  constructor(private readonly scenarioRepository: ScenarioRepository) {}

  async handle(
    query: ListScenariosQuery
  ): Promise<QueryResult<PaginatedResult<ScenarioDTO>>> {
    const result = await this.scenarioRepository.findByPlanId(
      PlanId.fromString(query.planId)
    );
    return QueryResult.success({
      items: result.items.map((s) => Scenario.toDTO(s)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
