import { ReceiptService } from '../services/receipt.service'
import { Receipt } from '../../domain/entities/receipt.entity'

export interface LinkReceiptToExpenseDto {
  receiptId: string
  expenseId: string
  workspaceId: string
}

export class LinkReceiptToExpenseHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: LinkReceiptToExpenseDto): Promise<Receipt> {
    return await this.receiptService.linkToExpense(
      dto.receiptId,
      dto.expenseId,
      dto.workspaceId
    )
  }
}
