import { Scenario } from "../entities/scenario.entity";
import { ScenarioId } from "../value-objects/scenario-id";
import { PlanId } from "../value-objects/plan-id";

export interface ScenarioRepository {
  save(scenario: Scenario): Promise<void>;
  findById(id: ScenarioId): Promise<Scenario | null>;
  findByPlanId(planId: PlanId): Promise<Scenario[]>;
  delete(id: ScenarioId): Promise<void>;
  findByName(planId: PlanId, name: string): Promise<Scenario | null>;
}
