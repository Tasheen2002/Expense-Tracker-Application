import { Attachment } from "../entities/attachment.entity";
import { AttachmentId } from "../value-objects/attachment-id";

export interface AttachmentRepository {
  save(attachment: Attachment): Promise<void>;

  findById(id: AttachmentId): Promise<Attachment | null>;

  findByExpense(expenseId: string): Promise<Attachment[]>;

  findByIds(ids: AttachmentId[]): Promise<Attachment[]>;

  delete(id: AttachmentId): Promise<void>;

  deleteByExpense(expenseId: string): Promise<void>;

  exists(id: AttachmentId): Promise<boolean>;

  getTotalSizeByExpense(expenseId: string): Promise<number>;
}
