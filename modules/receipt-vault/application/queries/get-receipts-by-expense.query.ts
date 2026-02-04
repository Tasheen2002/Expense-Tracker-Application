import { ReceiptService } from "../services/receipt.service";
import { Receipt } from "../../domain/entities/receipt.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface GetReceiptsByExpenseDto {
  expenseId: string;
  workspaceId: string;
}

export class GetReceiptsByExpenseHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    dto: GetReceiptsByExpenseDto,
  ): Promise<PaginatedResult<Receipt>> {
    return await this.receiptService.getReceiptsByExpense(
      dto.expenseId,
      dto.workspaceId,
    );
  }
}
