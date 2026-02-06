import { Scenario } from "../../domain/entities/scenario.entity";
import { ScenarioRepository } from "../../domain/repositories/scenario.repository";
import { BudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import {
  ScenarioNotFoundError,
  DuplicateScenarioNameError,
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
} from "../../domain/errors/budget-planning.errors";
import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ScenarioService {
  constructor(
    private readonly scenarioRepository: ScenarioRepository,
    private readonly budgetPlanRepository: BudgetPlanRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  private async checkPlanAccess(
    userId: string,
    planId: PlanId,
    action: string,
  ): Promise<void> {
    const plan = await this.budgetPlanRepository.findById(planId);
    if (!plan) {
      throw new BudgetPlanNotFoundError(planId.toString());
    }

    const isCreator = plan.getCreatedBy().getValue() === userId;
    const isAdminOrOwner = await this.workspaceAccess.isAdminOrOwner(
      userId,
      plan.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError(action);
    }
  }

  async createScenario(params: {
    planId: string;
    name: string;
    description?: string;
    assumptions?: Record<string, any>;
    createdBy: string;
  }): Promise<Scenario> {
    const planId = PlanId.fromString(params.planId);

    await this.checkPlanAccess(params.createdBy, planId, "create scenario");

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
    userId: string;
    name?: string;
    description?: string;
    assumptions?: Record<string, any>;
  }): Promise<Scenario> {
    const scenarioId = ScenarioId.fromString(params.id);
    const scenario = await this.scenarioRepository.findById(scenarioId);

    if (!scenario) {
      throw new ScenarioNotFoundError(params.id);
    }

    await this.checkPlanAccess(
      params.userId,
      scenario.getPlanId(),
      "update scenario",
    );

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

  async deleteScenario(id: string, userId: string): Promise<void> {
    const scenarioId = ScenarioId.fromString(id);
    const scenario = await this.scenarioRepository.findById(scenarioId);

    if (!scenario) {
      throw new ScenarioNotFoundError(id);
    }

    await this.checkPlanAccess(userId, scenario.getPlanId(), "delete scenario");

    await this.scenarioRepository.delete(scenarioId);
  }

  async getScenario(id: string, userId: string): Promise<Scenario> {
    const scenarioId = ScenarioId.fromString(id);
    const scenario = await this.scenarioRepository.findById(scenarioId);

    if (!scenario) {
      throw new ScenarioNotFoundError(id);
    }

    await this.checkPlanAccess(userId, scenario.getPlanId(), "view scenario");

    return scenario;
  }

  async listScenarios(
    planId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Scenario>> {
    const pId = PlanId.fromString(planId);
    await this.checkPlanAccess(userId, pId, "list scenarios");

    return this.scenarioRepository.findByPlanId(pId, options);
  }
}
