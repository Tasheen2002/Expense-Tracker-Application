import { Receipt } from '../entities/receipt.entity'
import { ReceiptId } from '../value-objects/receipt-id'
import { ReceiptStatus } from '../enums/receipt-status'
import { ReceiptType } from '../enums/receipt-type'

export interface ReceiptFilters {
  workspaceId: string
  userId?: string
  expenseId?: string
  status?: ReceiptStatus
  receiptType?: ReceiptType
  isLinked?: boolean // true = has expenseId, false = no expenseId
  isDeleted?: boolean
  fromDate?: Date
  toDate?: Date
  skip?: number
  take?: number
}

export interface IReceiptRepository {
  save(receipt: Receipt): Promise<void>
  findById(id: ReceiptId, workspaceId: string): Promise<Receipt | null>
  findByExpenseId(expenseId: string, workspaceId: string): Promise<Receipt[]>
  findByWorkspace(workspaceId: string): Promise<Receipt[]>
  findByUserId(userId: string, workspaceId: string): Promise<Receipt[]>
  findByFilters(filters: ReceiptFilters): Promise<Receipt[]>
  findByFileHash(fileHash: string, workspaceId: string): Promise<Receipt | null>
  findPendingReceipts(workspaceId: string): Promise<Receipt[]>
  findFailedReceipts(workspaceId: string): Promise<Receipt[]>
  exists(id: ReceiptId, workspaceId: string): Promise<boolean>
  delete(id: ReceiptId, workspaceId: string): Promise<void>
  countByWorkspace(workspaceId: string): Promise<number>
  countByStatus(workspaceId: string, status: ReceiptStatus): Promise<number>
  countByFilters(filters: ReceiptFilters): Promise<number>
}
