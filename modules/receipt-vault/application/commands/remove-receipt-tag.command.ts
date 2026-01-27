import { ReceiptService } from '../services/receipt.service'

export interface RemoveReceiptTagDto {
  receiptId: string
  tagId: string
  workspaceId: string
}

export class RemoveReceiptTagHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: RemoveReceiptTagDto): Promise<void> {
    return await this.receiptService.removeTag(dto.receiptId, dto.tagId, dto.workspaceId)
  }
}
