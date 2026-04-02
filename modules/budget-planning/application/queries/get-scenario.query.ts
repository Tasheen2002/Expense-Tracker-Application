import { ScenarioService } from '../services/scenario.service';
import { Scenario } from '../../domain/entities/scenario.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetScenarioQuery extends IQuery {
  id: string;
  userId: string;
}

export class GetScenarioHandler implements IQueryHandler<
  GetScenarioQuery,
  QueryResult<Scenario>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(query: GetScenarioQuery): Promise<QueryResult<Scenario>> {
    const result = await this.scenarioService.getScenario(
      query.id,
      query.userId
    );
    return QueryResult.success(result);
  }
}
