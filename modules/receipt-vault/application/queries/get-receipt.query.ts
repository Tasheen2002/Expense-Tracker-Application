import { ReceiptService } from '../services/receipt.service'
import { Receipt } from '../../domain/entities/receipt.entity'

export interface GetReceiptDto {
  receiptId: string
  workspaceId: string
}

export class GetReceiptHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: GetReceiptDto): Promise<Receipt | null> {
    return await this.receiptService.getReceipt(dto.receiptId, dto.workspaceId)
  }
}
