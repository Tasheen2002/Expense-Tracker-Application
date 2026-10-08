import { ReceiptMetadata } from "../entities/receipt-metadata.entity";
import { MetadataId } from "../value-objects/metadata-id";
import { ReceiptId } from "../value-objects/receipt-id";

export interface IReceiptMetadataRepository {
  save(metadata: ReceiptMetadata, workspaceId: string): Promise<void>;
  findById(id: MetadataId, workspaceId: string): Promise<ReceiptMetadata | null>;
  findByReceiptId(receiptId: ReceiptId, workspaceId: string): Promise<ReceiptMetadata | null>;
  delete(id: MetadataId, workspaceId: string): Promise<void>;
  deleteByReceiptId(receiptId: ReceiptId, workspaceId: string): Promise<void>;
  exists(id: MetadataId, workspaceId: string): Promise<boolean>;
}
