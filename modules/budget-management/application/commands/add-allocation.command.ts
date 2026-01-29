import { BudgetService } from "../services/budget.service";
import { BudgetAllocation } from "../../domain/entities/budget-allocation.entity";

export interface AddAllocationDto {
  budgetId: string;
  workspaceId: string;
  userId: string;
  categoryId?: string;
  allocatedAmount: number | string;
  description?: string;
}

export class AddAllocationHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: AddAllocationDto): Promise<BudgetAllocation> {
    return await this.budgetService.addAllocation({
      budgetId: dto.budgetId,
      workspaceId: dto.workspaceId,
      userId: dto.userId,
      categoryId: dto.categoryId,
      allocatedAmount: dto.allocatedAmount,
      description: dto.description,
    });
  }
}
