import { BudgetPlanService } from "../services/budget-plan.service";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PlanStatus } from "../../domain/enums/plan-status.enum";

export class ListBudgetPlansQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly status?: PlanStatus,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListBudgetPlansHandler {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(
    query: ListBudgetPlansQuery,
  ): Promise<PaginatedResult<BudgetPlan>> {
    return await this.budgetPlanService.listPlans(
      query.workspaceId,
      query.status,
      {
        limit: query.limit,
        offset: query.offset,
      },
    );
  }
}
