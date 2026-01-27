import { ReceiptService } from '../services/receipt.service'

export interface DeleteReceiptDto {
  receiptId: string
  workspaceId: string
  permanent?: boolean
}

export class DeleteReceiptHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: DeleteReceiptDto): Promise<void> {
    return await this.receiptService.deleteReceipt(
      dto.receiptId,
      dto.workspaceId,
      dto.permanent || false
    )
  }
}
