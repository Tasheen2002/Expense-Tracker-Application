import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { BudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { PlanPeriod } from "../../domain/value-objects/plan-period";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import {
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
} from "../../domain/errors/budget-planning.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";

export class BudgetPlanService {
  constructor(
    private readonly budgetPlanRepository: BudgetPlanRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  private async checkWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<boolean> {
    return this.workspaceAccess.isAdminOrOwner(userId, workspaceId);
  }

  async createPlan(params: {
    workspaceId: string;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    createdBy: string;
  }): Promise<BudgetPlan> {
    const hasAccess = await this.checkWorkspaceAccess(
      params.createdBy,
      params.workspaceId,
    );
    if (!hasAccess) {
      throw new UnauthorizedBudgetPlanAccessError("create");
    }

    const period = PlanPeriod.create(params.startDate, params.endDate);

    // Check for overlapping active plans if needed (business rule dependent)

    const plan = BudgetPlan.create({
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      description: params.description,
      period,
      createdBy: UserId.fromString(params.createdBy),
    });

    await this.budgetPlanRepository.save(plan);
    return plan;
  }

  async updatePlan(params: {
    id: string;
    userId: string;
    name?: string;
    description?: string;
  }): Promise<BudgetPlan> {
    const planId = PlanId.fromString(params.id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(params.id);
    }

    const isCreator = plan.getCreatedBy().getValue() === params.userId;
    const isAdminOrOwner = await this.checkWorkspaceAccess(
      params.userId,
      plan.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError("update");
    }

    plan.updateDetails(params.name, params.description);
    await this.budgetPlanRepository.save(plan);
    return plan;
  }

  async activatePlan(id: string, userId: string): Promise<BudgetPlan> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    const isCreator = plan.getCreatedBy().getValue() === userId;
    const isAdminOrOwner = await this.checkWorkspaceAccess(
      userId,
      plan.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError("activate");
    }

    plan.updateStatus(PlanStatus.ACTIVE);
    await this.budgetPlanRepository.save(plan);
    return plan;
  }

  async deletePlan(id: string, userId: string): Promise<void> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    const isCreator = plan.getCreatedBy().getValue() === userId;
    const isAdminOrOwner = await this.checkWorkspaceAccess(
      userId,
      plan.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError("delete");
    }

    // Add validation: Cannot delete active plans? Or specific status checks.

    await this.budgetPlanRepository.delete(planId);
  }

  async getPlan(id: string, userId: string): Promise<BudgetPlan> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    const hasAccess = await this.checkWorkspaceAccess(
      userId,
      plan.getWorkspaceId().getValue(),
    );

    if (!hasAccess) {
      throw new UnauthorizedBudgetPlanAccessError("view");
    }

    return plan;
  }

  async listPlans(
    userId: string,
    workspaceId: string,
    status?: PlanStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetPlan>> {
    const hasAccess = await this.checkWorkspaceAccess(userId, workspaceId);

    if (!hasAccess) {
      throw new UnauthorizedBudgetPlanAccessError("list");
    }

    const plans = await this.budgetPlanRepository.findAll(
      WorkspaceId.fromString(workspaceId),
      status,
      options,
    );
    return plans;
  }
}
