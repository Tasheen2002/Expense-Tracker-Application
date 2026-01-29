import { ReceiptService } from "../services/receipt.service";
import { Receipt } from "../../domain/entities/receipt.entity";

export interface VerifyReceiptDto {
  receiptId: string;
  workspaceId: string;
  userId: string;
}

export class VerifyReceiptHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: VerifyReceiptDto): Promise<Receipt> {
    return await this.receiptService.verifyReceipt(
      dto.receiptId,
      dto.workspaceId,
      dto.userId,
    );
  }
}
