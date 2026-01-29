import { ReceiptService } from "../services/receipt.service";
import { Receipt } from "../../domain/entities/receipt.entity";

export interface RejectReceiptDto {
  receiptId: string;
  workspaceId: string;
  userId: string;
  reason?: string;
}

export class RejectReceiptHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: RejectReceiptDto): Promise<Receipt> {
    return await this.receiptService.rejectReceipt(
      dto.receiptId,
      dto.workspaceId,
      dto.userId,
      dto.reason,
    );
  }
}
