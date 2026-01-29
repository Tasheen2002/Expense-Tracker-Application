import { BudgetService } from "../services/budget.service";
import { BudgetAllocation } from "../../domain/entities/budget-allocation.entity";

export interface UpdateAllocationDto {
  allocationId: string;
  workspaceId: string;
  userId: string;
  allocatedAmount?: number | string;
  description?: string | null;
}

export class UpdateAllocationHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: UpdateAllocationDto): Promise<BudgetAllocation> {
    return await this.budgetService.updateAllocation(
      dto.allocationId,
      dto.workspaceId,
      dto.userId,
      {
        allocatedAmount: dto.allocatedAmount,
        description: dto.description,
      },
    );
  }
}
