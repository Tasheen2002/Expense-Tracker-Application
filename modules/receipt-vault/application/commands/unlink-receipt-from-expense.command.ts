import { ReceiptService } from "../services/receipt.service";
import { Receipt } from "../../domain/entities/receipt.entity";

export interface UnlinkReceiptFromExpenseDto {
  receiptId: string;
  workspaceId: string;
  userId: string;
}

export class UnlinkReceiptFromExpenseHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: UnlinkReceiptFromExpenseDto): Promise<Receipt> {
    return await this.receiptService.unlinkFromExpense(
      dto.receiptId,
      dto.workspaceId,
      dto.userId,
    );
  }
}
