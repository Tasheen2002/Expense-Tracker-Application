import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListScenariosQuery extends IQuery {
  readonly planId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class ListScenariosHandler implements IQueryHandler<
  ListScenariosQuery,
  PaginatedResult<ScenarioDTO>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(query: ListScenariosQuery): Promise<PaginatedResult<ScenarioDTO>> {
    return this.scenarioService.getScenariosByPlan(
      query.planId,
      query.workspaceId,
    );
  }
}
