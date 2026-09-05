/**
 * Receipt Vault Module — Public API
 *
 * Only symbols exported from this file form the stable public interface of
 * the receipt-vault bounded context. All other paths inside this module are
 * considered internal implementation details and must NOT be imported
 * directly by other modules or application layers.
 */

// HTTP entry-point (used by the API app to mount routes)
export { registerReceiptVaultRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  ReceiptVaultError,
  ReceiptNotFoundError,
  InvalidStatusTransitionError,
  DuplicateReceiptError,
  ReceiptMetadataNotFoundError,
  ReceiptMetadataAlreadyExistsError,
  InvalidReceiptOperationError,
  ReceiptMissingStorageKeyError,
  ReceiptTagNotFoundError,
  DuplicateTagNameError,
  InvalidFileError,
  FileSizeExceededError,
  InvalidMimeTypeError,
} from './domain/errors/receipt.errors';

export { UnauthorizedAccessError } from './domain/errors/unauthorized-access.error';

// Domain enums (safe to share — value objects, not entities)
export { ReceiptStatus } from './domain/enums/receipt-status';
export { ReceiptType } from './domain/enums/receipt-type';
export { StorageProvider } from './domain/enums/storage-provider';
