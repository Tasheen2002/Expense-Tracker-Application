import { ReceiptService } from "../services/receipt.service";
import { ReceiptMetadata } from "../../domain/entities/receipt-metadata.entity";

export interface AddReceiptMetadataDto {
  receiptId: string;
  workspaceId: string;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  transactionDate?: Date;
  transactionTime?: string;
  subtotal?: number | string;
  taxAmount?: number | string;
  tipAmount?: number | string;
  totalAmount?: number | string;
  currency?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  invoiceNumber?: string;
  poNumber?: string;
  notes?: string;
}

export class AddReceiptMetadataHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: AddReceiptMetadataDto): Promise<ReceiptMetadata> {
    if (dto.notes) {
      dto.notes = this.escapeHtml(dto.notes);
    }
    return await this.receiptService.addMetadata(dto);
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
