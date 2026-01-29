import { BudgetPlanService } from "../services/budget-plan.service";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";

export class ActivateBudgetPlanCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}

export class ActivateBudgetPlanHandler {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(command: ActivateBudgetPlanCommand): Promise<BudgetPlan> {
    return await this.budgetPlanService.activatePlan(
      command.id,
      command.userId,
    );
  }
}
