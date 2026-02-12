import { Receipt } from "../entities/receipt.entity";
import { ReceiptId } from "../value-objects/receipt-id";
import { ReceiptStatus } from "../enums/receipt-status";
import { ReceiptType } from "../enums/receipt-type";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ReceiptFilters {
  workspaceId: string;
  userId?: string;
  expenseId?: string;
  status?: ReceiptStatus;
  receiptType?: ReceiptType;
  isLinked?: boolean; // true = has expenseId, false = no expenseId
  isDeleted?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export interface IReceiptRepository {
  save(receipt: Receipt): Promise<void>;
  findById(id: ReceiptId, workspaceId: string): Promise<Receipt | null>;
  findByExpenseId(
    expenseId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Receipt>>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Receipt>>;
  findByUserId(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Receipt>>;
  findByFilters(
    filters: ReceiptFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Receipt>>;
  findByFileHash(
    fileHash: string,
    workspaceId: string,
  ): Promise<Receipt | null>;
  findPendingReceipts(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Receipt>>;
  findFailedReceipts(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Receipt>>;
  exists(id: ReceiptId, workspaceId: string): Promise<boolean>;
  delete(id: ReceiptId, workspaceId: string): Promise<void>;
  countByWorkspace(workspaceId: string): Promise<number>;
  countByStatus(workspaceId: string, status: ReceiptStatus): Promise<number>;
  countByFilters(filters: ReceiptFilters): Promise<number>;
  getStatusCounts(workspaceId: string): Promise<Record<string, number>>;
  deleteWithDependencies(id: ReceiptId, workspaceId: string): Promise<void>;
}
