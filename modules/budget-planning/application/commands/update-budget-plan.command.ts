import { BudgetPlanService } from "../services/budget-plan.service";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";

export class UpdateBudgetPlanCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name?: string,
    public readonly description?: string,
  ) {}
}

export class UpdateBudgetPlanHandler {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(command: UpdateBudgetPlanCommand): Promise<BudgetPlan> {
    return await this.budgetPlanService.updatePlan({
      id: command.id,
      userId: command.userId,
      name: command.name,
      description: command.description,
    });
  }
}
