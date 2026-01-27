import { ReceiptService } from '../services/receipt.service'
import { ReceiptMetadata } from '../../domain/entities/receipt-metadata.entity'

export interface GetReceiptMetadataDto {
  receiptId: string
  workspaceId: string
}

export class GetReceiptMetadataHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: GetReceiptMetadataDto): Promise<ReceiptMetadata | null> {
    return await this.receiptService.getMetadata(dto.receiptId, dto.workspaceId)
  }
}
