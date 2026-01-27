import { ReceiptService } from '../services/receipt.service'
import { Receipt } from '../../domain/entities/receipt.entity'
import { ReceiptStatus } from '../../domain/enums/receipt-status'
import { ReceiptType } from '../../domain/enums/receipt-type'

export interface ListReceiptsDto {
  workspaceId: string
  userId?: string
  expenseId?: string
  status?: ReceiptStatus
  receiptType?: ReceiptType
  isLinked?: boolean
  isDeleted?: boolean
  fromDate?: Date
  toDate?: Date
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export class ListReceiptsHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: ListReceiptsDto): Promise<PaginatedResult<Receipt>> {
    return await this.receiptService.filterReceiptsPaginated(dto)
  }
}
