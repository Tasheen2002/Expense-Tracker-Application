import { Scenario } from "../../domain/entities/scenario.entity";
import { ScenarioRepository } from "../../domain/repositories/scenario.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import {
  ScenarioNotFoundError,
  DuplicateScenarioNameError,
} from "../../domain/errors/budget-planning.errors";

export class ScenarioService {
  constructor(private readonly scenarioRepository: ScenarioRepository) {}

  async createScenario(params: {
    planId: string;
    name: string;
    description?: string;
    assumptions?: Record<string, any>;
    createdBy: string;
  }): Promise<Scenario> {
    const planId = PlanId.fromString(params.planId);

    const existing = await this.scenarioRepository.findByName(
      planId,
      params.name,
    );
    if (existing) {
      throw new DuplicateScenarioNameError(params.name);
    }

    const scenario = Scenario.create({
      planId,
      name: params.name,
      description: params.description,
      assumptions: params.assumptions,
      createdBy: UserId.fromString(params.createdBy),
    });

    await this.scenarioRepository.save(scenario);
    return scenario;
  }

  async updateScenario(params: {
    id: string;
    name?: string;
    description?: string;
    assumptions?: Record<string, any>;
  }): Promise<Scenario> {
    const scenarioId = ScenarioId.fromString(params.id);
    const scenario = await this.scenarioRepository.findById(scenarioId);

    if (!scenario) {
      throw new ScenarioNotFoundError(params.id);
    }

    if (params.name && params.name !== scenario.getName()) {
      // Check duplication if name is changing
      const existing = await this.scenarioRepository.findByName(
        scenario.getPlanId(),
        params.name,
      );
      if (existing) {
        throw new DuplicateScenarioNameError(params.name);
      }
    }

    scenario.updateDetails({
      name: params.name,
      description: params.description,
      assumptions: params.assumptions,
    });

    await this.scenarioRepository.save(scenario);
    return scenario;
  }

  async deleteScenario(id: string): Promise<void> {
    const scenarioId = ScenarioId.fromString(id);
    const scenario = await this.scenarioRepository.findById(scenarioId);

    if (!scenario) {
      throw new ScenarioNotFoundError(id);
    }

    await this.scenarioRepository.delete(scenarioId);
  }

  async getScenario(id: string): Promise<Scenario> {
    const scenarioId = ScenarioId.fromString(id);
    const scenario = await this.scenarioRepository.findById(scenarioId);

    if (!scenario) {
      throw new ScenarioNotFoundError(id);
    }
    return scenario;
  }

  async listScenarios(planId: string): Promise<Scenario[]> {
    return this.scenarioRepository.findByPlanId(PlanId.fromString(planId));
  }
}
