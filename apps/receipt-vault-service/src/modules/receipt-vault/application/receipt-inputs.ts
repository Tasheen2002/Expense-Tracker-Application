import { CreateMetadataData } from '../domain/entities/receipt-metadata.entity';
import { ReceiptValidationError } from '../domain/errors/receipt.errors';
import { PaginationOptions } from '@core/domain/interfaces/paginated-result.interface';

export type ReceiptMetadataInput = Omit<CreateMetadataData, 'receiptId'>;

// HTTP commands expose metadata fields only, excluding richer internal inputs.
export type ReceiptMetadataCommandFields = Readonly<Omit<ReceiptMetadataInput, 'lineItems' | 'customFields'>>;

export function pagination(options?: PaginationOptions): PaginationOptions {
  const limit = options?.limit ?? 50, offset = options?.offset ?? 0;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0 || offset > 2147483647) {
    throw new ReceiptValidationError('pagination', 'Expected limit 1–100 and offset 0–2147483647');
  }
  return { limit, offset };
}
