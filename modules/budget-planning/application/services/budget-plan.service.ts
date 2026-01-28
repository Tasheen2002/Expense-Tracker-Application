import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { BudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { PlanPeriod } from "../../domain/value-objects/plan-period";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import {
  BudgetPlanNotFoundError,
  InvalidPlanPeriodError,
} from "../../domain/errors/budget-planning.errors";

export class BudgetPlanService {
  constructor(private readonly budgetPlanRepository: BudgetPlanRepository) {}

  async createPlan(params: {
    workspaceId: string;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    createdBy: string;
  }): Promise<BudgetPlan> {
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
    name?: string;
    description?: string;
  }): Promise<BudgetPlan> {
    const planId = PlanId.fromString(params.id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(params.id);
    }

    plan.updateDetails(params.name, params.description);
    await this.budgetPlanRepository.save(plan);
    return plan;
  }

  async activatePlan(id: string): Promise<BudgetPlan> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    plan.updateStatus(PlanStatus.ACTIVE);
    await this.budgetPlanRepository.save(plan);
    return plan;
  }

  async deletePlan(id: string): Promise<void> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    // Add validation: Cannot delete active plans? Or specific status checks.

    await this.budgetPlanRepository.delete(planId);
  }

  async getPlan(id: string): Promise<BudgetPlan> {
    const planId = PlanId.fromString(id);
    const plan = await this.budgetPlanRepository.findById(planId);

    if (!plan) {
      throw new BudgetPlanNotFoundError(id);
    }

    return plan;
  }

  async listPlans(
    workspaceId: string,
    status?: PlanStatus,
  ): Promise<BudgetPlan[]> {
    return this.budgetPlanRepository.findAll(
      WorkspaceId.fromString(workspaceId),
      status,
    );
  }
}
