import { ReceiptId } from '../value-objects/receipt-id'
import { TagId } from '../value-objects/tag-id'

export interface IReceiptTagRepository {
  addTag(receiptId: ReceiptId, tagId: TagId): Promise<void>
  removeTag(receiptId: ReceiptId, tagId: TagId): Promise<void>
  findTagsByReceipt(receiptId: ReceiptId): Promise<TagId[]>
  findReceiptsByTag(tagId: TagId, workspaceId: string): Promise<ReceiptId[]>
  removeAllTagsFromReceipt(receiptId: ReceiptId): Promise<void>
  hasTag(receiptId: ReceiptId, tagId: TagId): Promise<boolean>
}
