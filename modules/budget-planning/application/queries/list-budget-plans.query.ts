import { BudgetPlanService } from "../services/budget-plan.service";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { PlanStatus } from "../../domain/enums/plan-status.enum";

export class ListBudgetPlansQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly status?: PlanStatus,
  ) {}
}

export class ListBudgetPlansHandler {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(query: ListBudgetPlansQuery): Promise<BudgetPlan[]> {
    return await this.budgetPlanService.listPlans(
      query.workspaceId,
      query.status,
    );
  }
}
