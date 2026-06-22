import { ReceiptMetadata } from "../entities/receipt-metadata.entity";
import { MetadataId } from "../value-objects/metadata-id";
import { ReceiptId } from "../value-objects/receipt-id";

export interface IReceiptMetadataRepository {
  save(metadata: ReceiptMetadata): Promise<void>;
  findById(id: MetadataId): Promise<ReceiptMetadata | null>;
  findByReceiptId(receiptId: ReceiptId): Promise<ReceiptMetadata | null>;
  delete(id: MetadataId): Promise<void>;
  deleteByReceiptId(receiptId: ReceiptId): Promise<void>;
  exists(id: MetadataId): Promise<boolean>;
}
