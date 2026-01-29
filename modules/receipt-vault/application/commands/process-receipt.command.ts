import { ReceiptService } from "../services/receipt.service";
import { Receipt } from "../../domain/entities/receipt.entity";

export interface ProcessReceiptDto {
  receiptId: string;
  workspaceId: string;
  userId: string;
  ocrText?: string;
  ocrConfidence?: number;
}

export class ProcessReceiptHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: ProcessReceiptDto): Promise<Receipt> {
    return await this.receiptService.processReceipt(
      dto.receiptId,
      dto.workspaceId,
      dto.userId,
      dto.ocrText,
      dto.ocrConfidence,
    );
  }
}
