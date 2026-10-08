import { getAuthorizedPlan } from './plan-access';
import { BudgetPlan, BudgetPlanDTO } from "../../domain/entities/budget-plan.entity";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { PlanPeriod } from "../../domain/value-objects/plan-period";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import { PeriodType } from "../../domain/enums/period-type.enum";
import {
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
    description?: string | null;
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

    const period = PlanPeriod.createDateOnly(params.startDate, params.endDate);

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
    description?: string | null;
  }): Promise<BudgetPlanDTO> {
    const planId = PlanId.fromString(params.id);
    const plan = await getAuthorizedPlan(
      this.budgetPlanRepository,
      this.workspaceAccess,
      params.userId,
      planId,
      params.workspaceId,
      'update',
    );

    plan.updateDetails(params.name, params.description);
    await this.budgetPlanRepository.save(plan);
    return BudgetPlan.toDTO(plan);
  }

  async activatePlan(id: string, workspaceId: string, userId: string): Promise<BudgetPlanDTO> {
    const planId = PlanId.fromString(id);
    const plan = await getAuthorizedPlan(
      this.budgetPlanRepository,
      this.workspaceAccess,
      userId,
      planId,
      workspaceId,
      'activate',
    );

    plan.updateStatus(PlanStatus.ACTIVE);
    await this.budgetPlanRepository.save(plan);
    return BudgetPlan.toDTO(plan);
  }

  async archivePlan(id: string, workspaceId: string, userId: string): Promise<BudgetPlanDTO> {
    const planId = PlanId.fromString(id);
    const plan = await getAuthorizedPlan(
      this.budgetPlanRepository,
      this.workspaceAccess,
      userId,
      planId,
      workspaceId,
      'archive',
    );

    plan.updateStatus(PlanStatus.ARCHIVED);
    await this.budgetPlanRepository.save(plan);
    return BudgetPlan.toDTO(plan);
  }

  async deletePlan(id: string, workspaceId: string, userId: string): Promise<void> {
    const planId = PlanId.fromString(id);
    const plan = await getAuthorizedPlan(
      this.budgetPlanRepository,
      this.workspaceAccess,
      userId,
      planId,
      workspaceId,
      'delete',
    );

    plan.markAsDeleted();
    await this.budgetPlanRepository.delete(planId, plan.workspaceId.getValue(), plan);
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
