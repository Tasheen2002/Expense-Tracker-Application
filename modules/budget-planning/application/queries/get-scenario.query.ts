import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import { ScenarioNotFoundError } from '../../domain/errors/budget-planning.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetScenarioQuery extends IQuery {
  id: string;
  workspaceId: string;
  userId: string;
}

export class GetScenarioHandler implements IQueryHandler<
  GetScenarioQuery,
  QueryResult<ScenarioDTO>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(query: GetScenarioQuery): Promise<QueryResult<ScenarioDTO>> {
    const dto = await this.scenarioService.getScenarioById(query.id, query.workspaceId);
    if (!dto) {
      throw new ScenarioNotFoundError(query.id);
    }
    return QueryResult.success(dto);
  }
}
