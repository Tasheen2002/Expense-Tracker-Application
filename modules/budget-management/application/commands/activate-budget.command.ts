import { BudgetService } from "../services/budget.service";
import { Budget } from "../../domain/entities/budget.entity";

export interface ActivateBudgetDto {
  budgetId: string;
  workspaceId: string;
  userId: string;
}

export class ActivateBudgetHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: ActivateBudgetDto): Promise<Budget> {
    return await this.budgetService.activateBudget(
      dto.budgetId,
      dto.workspaceId,
      dto.userId,
    );
  }
}
