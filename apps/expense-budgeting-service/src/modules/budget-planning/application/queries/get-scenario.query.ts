import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import { ScenarioNotFoundError } from '../../domain/errors/budget-planning.errors';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetScenarioQuery extends IQuery {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetScenarioHandler implements IQueryHandler<
  GetScenarioQuery,
  ScenarioDTO
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(query: GetScenarioQuery): Promise<ScenarioDTO> {
    const dto = await this.scenarioService.getScenarioById(query.id, query.workspaceId);
    if (!dto) {
      throw new ScenarioNotFoundError(query.id);
    }
    return dto;
  }
}
