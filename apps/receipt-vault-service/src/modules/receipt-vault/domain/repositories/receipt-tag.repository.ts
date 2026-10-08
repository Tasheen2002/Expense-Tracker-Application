import { ReceiptId } from "../value-objects/receipt-id";
import { TagId } from "../value-objects/tag-id";

export interface IReceiptTagRepository {
  addTag(receiptId: ReceiptId, tagId: TagId, workspaceId: string): Promise<void>;
  removeTag(receiptId: ReceiptId, tagId: TagId, workspaceId: string): Promise<void>;
  findTagsByReceipt(receiptId: ReceiptId, workspaceId: string): Promise<TagId[]>;
  removeAllTagsFromReceipt(receiptId: ReceiptId, workspaceId: string): Promise<void>;
  hasTag(receiptId: ReceiptId, tagId: TagId, workspaceId: string): Promise<boolean>;
}
