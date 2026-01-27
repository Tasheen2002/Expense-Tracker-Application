import { ReceiptService } from '../services/receipt.service'

export interface GetReceiptStatsDto {
  workspaceId: string
}

export interface ReceiptStats {
  total: number
  pending: number
  processing: number
  processed: number
  failed: number
  verified: number
}

export class GetReceiptStatsHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: GetReceiptStatsDto): Promise<ReceiptStats> {
    return await this.receiptService.getReceiptStats(dto.workspaceId)
  }
}
