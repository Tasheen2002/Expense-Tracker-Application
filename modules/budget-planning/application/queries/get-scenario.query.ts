import { IScenarioRepository } from '../../domain/repositories/scenario.repository';
import { Scenario, ScenarioDTO } from '../../domain/entities/scenario.entity';
import { ScenarioId } from '../../domain/value-objects/scenario-id';
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
  constructor(private readonly scenarioRepository: IScenarioRepository) {}

  async handle(query: GetScenarioQuery): Promise<QueryResult<ScenarioDTO>> {
    const scenario = await this.scenarioRepository.findById(
      ScenarioId.fromString(query.id),
      query.workspaceId
    );
    if (!scenario) {
      throw new ScenarioNotFoundError(query.id);
    }
    return QueryResult.success(Scenario.toDTO(scenario));
  }
}
