import { BudgetPlanService } from "../services/budget-plan.service";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";

export class GetBudgetPlanQuery {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}

export class GetBudgetPlanHandler {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(query: GetBudgetPlanQuery): Promise<BudgetPlan> {
    return await this.budgetPlanService.getPlan(query.id, query.userId);
  }
}
