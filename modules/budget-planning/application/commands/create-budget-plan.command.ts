import { BudgetPlanService } from "../services/budget-plan.service";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";

export class CreateBudgetPlanCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly createdBy: string,
    public readonly description?: string,
  ) {}
}

export class CreateBudgetPlanHandler {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(command: CreateBudgetPlanCommand): Promise<BudgetPlan> {
    return await this.budgetPlanService.createPlan({
      workspaceId: command.workspaceId,
      name: command.name,
      description: command.description,
      startDate: command.startDate,
      endDate: command.endDate,
      createdBy: command.createdBy,
    });
  }
}
