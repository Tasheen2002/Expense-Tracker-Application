import { ReceiptService } from '../services/receipt.service'

export interface AddReceiptTagDto {
  receiptId: string
  tagId: string
  workspaceId: string
}

export class AddReceiptTagHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: AddReceiptTagDto): Promise<void> {
    return await this.receiptService.addTag(dto.receiptId, dto.tagId, dto.workspaceId)
  }
}
