import { BudgetPlan, BudgetPlanDTO } from "../../domain/entities/budget-plan.entity";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { WorkspaceId, UserId } from "../../../identity-workspace";
import { PlanPeriod } from "../../domain/value-objects/plan-period";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import { PeriodType } from "../../domain/enums/period-type.enum";
import {
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
} from "../../domain/errors/budget-planning.errors";
import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class BudgetPlanService {
  constructor(
    private readonly budgetPlanRepository: IBudgetPlanRepository,
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
    periodType: PeriodType;
    description?: string;
    startDate: Date;
    endDate: Date;
    createdBy: string;
  }): Promise<BudgetPlanDTO> {
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
      periodType: params.periodType,
      period,
      createdBy: UserId.fromString(params.createdBy),
    });

    await this.budgetPlanRepository.save(plan);
    return BudgetPlan.toDTO(plan);
  }

  async updatePlan(params: {
    id: string;
    workspaceId: string;
    userId: string;
    name?: string;
    description?: string;
  }): Promise<BudgetPlanDTO> {
    const planId = PlanId.fromString(params.id);
    const plan = await this.budgetPlanRepository.findById(planId, params.workspaceId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(params.id);
    }

    const isCreator = plan.createdBy.getValue() === params.userId;
    const isAdminOrOwner = await this.checkWorkspaceAccess(
      params.userId,
      plan.workspaceId.getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError("update");
    }

    plan.updateDetails(params.name, params.description);
    await this.budgetPlanRepository.save(plan);
    return BudgetPlan.toDTO(plan);
  }

  async activatePlan(id: string, workspaceId: string, userId: string): Promise<BudgetPlanDTO> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId, workspaceId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    const isCreator = plan.createdBy.getValue() === userId;
    const isAdminOrOwner = await this.checkWorkspaceAccess(
      userId,
      plan.workspaceId.getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError("activate");
    }

    plan.updateStatus(PlanStatus.ACTIVE);
    await this.budgetPlanRepository.save(plan);
    return BudgetPlan.toDTO(plan);
  }

  async deletePlan(id: string, workspaceId: string, userId: string): Promise<void> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId, workspaceId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    const isCreator = plan.createdBy.getValue() === userId;
    const isAdminOrOwner = await this.checkWorkspaceAccess(
      userId,
      plan.workspaceId.getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError("delete");
    }

    // Add validation: Cannot delete active plans? Or specific status checks.

    await this.budgetPlanRepository.delete(planId);
  }

  async getPlanById(id: string, workspaceId: string): Promise<BudgetPlanDTO | null> {
    const plan = await this.budgetPlanRepository.findById(PlanId.fromString(id), workspaceId);
    return plan ? BudgetPlan.toDTO(plan) : null;
  }

  async getPlans(
    workspaceId: string,
    status?: PlanStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetPlanDTO>> {
    const result = await this.budgetPlanRepository.findAll(
      WorkspaceId.fromString(workspaceId),
      status,
      options,
    );
    return { ...result, items: result.items.map((p) => BudgetPlan.toDTO(p)) };
  }

}
