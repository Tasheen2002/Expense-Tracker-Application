import { Scenario } from "../../domain/entities/scenario.entity";
import { IScenarioRepository } from "../../domain/repositories/scenario.repository";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { UserId } from "../../../identity-workspace";
import {
  ScenarioNotFoundError,
  DuplicateScenarioNameError,
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
} from "../../domain/errors/budget-planning.errors";
import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";

export class ScenarioService {
  constructor(
    private readonly scenarioRepository: IScenarioRepository,
    private readonly budgetPlanRepository: IBudgetPlanRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  private async checkPlanAccess(
    userId: string,
    planId: PlanId,
    workspaceId: string,
    action: string,
  ): Promise<void> {
    const plan = await this.budgetPlanRepository.findById(planId, workspaceId);
    if (!plan) {
      throw new BudgetPlanNotFoundError(planId.getValue());
    }

    const isCreator = plan.createdBy.getValue() === userId;
    const isAdminOrOwner = await this.workspaceAccess.isAdminOrOwner(
      userId,
      plan.workspaceId.getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError(action);
    }
  }

  async createScenario(params: {
    planId: string;
    workspaceId: string;
    name: string;
    description?: string;
    assumptions?: Record<string, unknown>;
    createdBy: string;
  }): Promise<Scenario> {
    const planId = PlanId.fromString(params.planId);

    await this.checkPlanAccess(params.createdBy, planId, params.workspaceId, "create scenario");

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
    workspaceId: string;
    userId: string;
    name?: string;
    description?: string;
    assumptions?: Record<string, unknown>;
  }): Promise<Scenario> {
    const scenarioId = ScenarioId.fromString(params.id);
    const scenario = await this.scenarioRepository.findById(scenarioId, params.workspaceId);

    if (!scenario) {
      throw new ScenarioNotFoundError(params.id);
    }

    await this.checkPlanAccess(
      params.userId,
      scenario.planId,
      params.workspaceId,
      "update scenario",
    );

    if (params.name && params.name !== scenario.name) {
      // Check duplication if name is changing
      const existing = await this.scenarioRepository.findByName(
        scenario.planId,
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

  async deleteScenario(id: string, workspaceId: string, userId: string): Promise<void> {
    const scenarioId = ScenarioId.fromString(id);
    const scenario = await this.scenarioRepository.findById(scenarioId, workspaceId);

    if (!scenario) {
      throw new ScenarioNotFoundError(id);
    }

    await this.checkPlanAccess(userId, scenario.planId, workspaceId, "delete scenario");

    await this.scenarioRepository.delete(scenarioId);
  }

}
