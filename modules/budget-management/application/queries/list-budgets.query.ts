import { BudgetService } from "../services/budget.service";
import { Budget } from "../../domain/entities/budget.entity";
import { BudgetStatus } from "../../domain/enums/budget-status";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ListBudgetsDto {
  workspaceId: string;
  status?: BudgetStatus;
  isActive?: boolean;
  createdBy?: string;
  currency?: string;
  limit?: number;
  offset?: number;
}

export class ListBudgetsHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: ListBudgetsDto): Promise<PaginatedResult<Budget>> {
    const limit = dto.limit || 50;
    const offset = dto.offset || 0;

    if (
      dto.status ||
      dto.isActive !== undefined ||
      dto.createdBy ||
      dto.currency
    ) {
      return await this.budgetService.filterBudgets(
        {
          workspaceId: dto.workspaceId,
          status: dto.status,
          isActive: dto.isActive,
          createdBy: dto.createdBy,
          currency: dto.currency,
        },
        { limit, offset },
      );
    }

    return await this.budgetService.getBudgetsByWorkspace(dto.workspaceId, {
      limit,
      offset,
    });
  }
}
