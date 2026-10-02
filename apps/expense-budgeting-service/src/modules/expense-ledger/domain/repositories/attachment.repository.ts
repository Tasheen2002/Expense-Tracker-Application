import { Attachment } from "../entities/attachment.entity";
import { AttachmentId } from "../value-objects/attachment-id";
import { ExpenseId } from "../value-objects/expense-id";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IAttachmentRepository {
  /** Atomically enforce the per-expense size limit and insert the attachment. */
  saveWithinSizeLimit(attachment: Attachment, workspaceId: string, maxTotalSize: number): Promise<void>;

  findById(id: AttachmentId, workspaceId: string): Promise<Attachment | null>;

  findByExpense(
    expenseId: ExpenseId | string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Attachment>>;

  findByIds(ids: AttachmentId[], workspaceId: string): Promise<Attachment[]>;

  delete(id: AttachmentId, workspaceId: string): Promise<void>;

  deleteByExpense(expenseId: ExpenseId | string, workspaceId: string): Promise<void>;

  exists(id: AttachmentId, workspaceId: string): Promise<boolean>;

  getTotalSizeByExpense(expenseId: ExpenseId | string, workspaceId: string): Promise<number>;
}

