import { BudgetService } from "../services/budget.service";

export interface DeleteAllocationDto {
  allocationId: string;
  workspaceId: string;
  userId: string;
}

export class DeleteAllocationHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: DeleteAllocationDto): Promise<void> {
    await this.budgetService.deleteAllocation(
      dto.allocationId,
      dto.workspaceId,
      dto.userId,
    );
  }
}
