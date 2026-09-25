import { Scenario } from "../entities/scenario.entity";
import { ScenarioId } from "../value-objects/scenario-id";
import { PlanId } from "../value-objects/plan-id";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IScenarioRepository {
  save(scenario: Scenario): Promise<void>;
  findById(id: ScenarioId, workspaceId: string): Promise<Scenario | null>;
  findByPlanId(
    planId: PlanId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Scenario>>;
  delete(id: ScenarioId, workspaceId: string): Promise<void>;
  findByName(planId: PlanId, name: string, workspaceId: string): Promise<Scenario | null>;
  countByPlanId(planId: PlanId, workspaceId: string): Promise<number>;
}
