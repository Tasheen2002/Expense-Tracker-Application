import { BudgetService } from "../services/budget.service";
import { Budget } from "../../domain/entities/budget.entity";

export interface UpdateBudgetDto {
  budgetId: string;
  workspaceId: string;
  userId: string;
  name?: string;
  description?: string | null;
  totalAmount?: number | string;
}

export class UpdateBudgetHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: UpdateBudgetDto): Promise<Budget> {
    return await this.budgetService.updateBudget(
      dto.budgetId,
      dto.workspaceId,
      dto.userId,
      {
        name: dto.name,
        description: dto.description,
        totalAmount: dto.totalAmount,
      },
    );
  }
}
