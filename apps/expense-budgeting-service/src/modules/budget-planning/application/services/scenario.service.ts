import { Scenario, ScenarioDTO } from "../../domain/entities/scenario.entity";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { IScenarioRepository } from "../../domain/repositories/scenario.repository";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { UserId, WorkspaceId } from '@core/domain/value-objects';
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import { PLANNING_CONSTANTS } from "../../domain/constants/planning.constants";
import {
  ScenarioNotFoundError,
  DuplicateScenarioNameError,
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
  MaxScenariosExceededError,
  PlanNotModifiableError,
} from "../../domain/errors/budget-planning.errors";
import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';

export class ScenarioService {
  constructor(
    private readonly scenarioRepository: IScenarioRepository,
    private readonly budgetPlanRepository: IBudgetPlanRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
    private readonly unitOfWork?: IUnitOfWork,
  ) {}

  private async checkPlanAccess(
    userId: string,
    planId: PlanId,
    workspaceId: string,
    action: string,
  ): Promise<BudgetPlan> {
    const plan = await this.budgetPlanRepository.findById(planId, workspaceId);
    if (!plan) {
      throw new BudgetPlanNotFoundError(planId.getValue(), workspaceId);
    }

    const isCreator = plan.createdBy.getValue() === userId;
    const isAdminOrOwner = await this.workspaceAccess.isAdminOrOwner(
      userId,
      plan.workspaceId.getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError(action);
    }

    return plan;
  }

  async createScenario(params: {
    planId: string;
    workspaceId: string;
    name: string;
    description?: string;
    assumptions?: Record<string, unknown>;
    createdBy: string;
  }): Promise<ScenarioDTO> {
    const planId = PlanId.fromString(params.planId);

    const plan = await this.checkPlanAccess(params.createdBy, planId, params.workspaceId, "create scenario");

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(planId.getValue(), plan.status, 'add scenarios to');
    }

    const scenarioCount = await this.scenarioRepository.countByPlanId(planId, params.workspaceId);
    if (scenarioCount >= PLANNING_CONSTANTS.MAX_SCENARIOS_PER_PLAN) {
      throw new MaxScenariosExceededError(planId.getValue(), PLANNING_CONSTANTS.MAX_SCENARIOS_PER_PLAN);
    }

    const existing = await this.scenarioRepository.findByName(
      planId,
      params.name,
      params.workspaceId,
    );
    if (existing) {
      throw new DuplicateScenarioNameError(params.name);
    }

    const scenario = Scenario.create({
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      planId,
      name: params.name,
      description: params.description,
      assumptions: params.assumptions,
      createdBy: UserId.fromString(params.createdBy),
    });

    const executeCreate = async () => {
      await this.scenarioRepository.save(scenario);
      plan.recordScenarioCreated(scenario.id.getValue(), scenario.name);
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeCreate);
    } else {
      await executeCreate();
    }

    return Scenario.toDTO(scenario);
  }

  async updateScenario(params: {
    id: string;
    workspaceId: string;
    userId: string;
    name?: string;
    description?: string;
    assumptions?: Record<string, unknown>;
  }): Promise<ScenarioDTO> {
    const scenarioId = ScenarioId.fromString(params.id);
    const scenario = await this.scenarioRepository.findById(scenarioId, params.workspaceId);

    if (!scenario) {
      throw new ScenarioNotFoundError(params.id, params.workspaceId);
    }

    const plan = await this.checkPlanAccess(
      params.userId,
      scenario.planId,
      params.workspaceId,
      "update scenario",
    );

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(plan.id.getValue(), plan.status, 'update scenarios in');
    }

    if (params.name && params.name !== scenario.name) {
      // Check duplication if name is changing
      const existing = await this.scenarioRepository.findByName(
        scenario.planId,
        params.name,
        params.workspaceId,
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

    const executeUpdate = async () => {
      await this.scenarioRepository.save(scenario);
      plan.recordScenarioUpdated(scenario.id.getValue());
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeUpdate);
    } else {
      await executeUpdate();
    }

    return Scenario.toDTO(scenario);
  }

  async deleteScenario(id: string, workspaceId: string, userId: string): Promise<void> {
    const scenarioId = ScenarioId.fromString(id);
    const scenario = await this.scenarioRepository.findById(scenarioId, workspaceId);

    if (!scenario) {
      throw new ScenarioNotFoundError(id, workspaceId);
    }

    const plan = await this.checkPlanAccess(userId, scenario.planId, workspaceId, "delete scenario");

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(plan.id.getValue(), plan.status, 'delete scenarios from');
    }

    const executeDelete = async () => {
      // Delete child first in transaction
      await this.scenarioRepository.delete(scenarioId, workspaceId);
      // Record and dispatch domain event on aggregate root
      plan.recordScenarioDeleted(scenarioId.getValue());
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeDelete);
    } else {
      await executeDelete();
    }
  }

  async getScenarioById(id: string, workspaceId: string): Promise<ScenarioDTO | null> {
    const scenario = await this.scenarioRepository.findById(ScenarioId.fromString(id), workspaceId);
    return scenario ? Scenario.toDTO(scenario) : null;
  }

  async getScenariosByPlan(
    planId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ScenarioDTO>> {
    const result = await this.scenarioRepository.findByPlanId(
      PlanId.fromString(planId),
      workspaceId,
      options,
    );
    return { ...result, items: result.items.map((s) => Scenario.toDTO(s)) };
  }
}
