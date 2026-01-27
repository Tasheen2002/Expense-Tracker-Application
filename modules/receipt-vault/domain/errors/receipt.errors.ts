/**
 * Base error class for Receipt Vault domain errors
 */
export class ReceiptVaultError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Receipt not found error
 */
export class ReceiptNotFoundError extends ReceiptVaultError {
  constructor(receiptId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Receipt with ID ${receiptId} not found in workspace ${workspaceId}`
      : `Receipt with ID ${receiptId} not found`;
    super(message, 'RECEIPT_NOT_FOUND', 404);
  }
}

/**
 * Invalid status transition error
 */
export class InvalidStatusTransitionError extends ReceiptVaultError {
  constructor(from: string, to: string) {
    super(
      `Cannot transition receipt status from ${from} to ${to}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }
}

/**
 * Duplicate receipt error (based on file hash)
 */
export class DuplicateReceiptError extends ReceiptVaultError {
  constructor(fileHash: string) {
    super(
      `A receipt with file hash ${fileHash} already exists`,
      'DUPLICATE_RECEIPT',
      409
    );
  }
}

/**
 * Receipt metadata not found error
 */
export class ReceiptMetadataNotFoundError extends ReceiptVaultError {
  constructor(receiptId: string) {
    super(
      `Metadata not found for receipt ${receiptId}`,
      'RECEIPT_METADATA_NOT_FOUND',
      404
    );
  }
}

/**
 * Receipt metadata already exists error
 */
export class ReceiptMetadataAlreadyExistsError extends ReceiptVaultError {
  constructor(receiptId: string) {
    super(
      `Metadata already exists for receipt ${receiptId}`,
      'RECEIPT_METADATA_ALREADY_EXISTS',
      409
    );
  }
}

/**
 * Invalid receipt operation error
 */
export class InvalidReceiptOperationError extends ReceiptVaultError {
  constructor(operation: string, reason: string) {
    super(
      `Cannot ${operation}: ${reason}`,
      'INVALID_RECEIPT_OPERATION',
      400
    );
  }
}

/**
 * Receipt tag not found error
 */
export class ReceiptTagNotFoundError extends ReceiptVaultError {
  constructor(tagId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Tag with ID ${tagId} not found in workspace ${workspaceId}`
      : `Tag with ID ${tagId} not found`;
    super(message, 'RECEIPT_TAG_NOT_FOUND', 404);
  }
}

/**
 * Duplicate tag name error
 */
export class DuplicateTagNameError extends ReceiptVaultError {
  constructor(tagName: string, workspaceId: string) {
    super(
      `Tag with name "${tagName}" already exists in workspace ${workspaceId}`,
      'DUPLICATE_TAG_NAME',
      409
    );
  }
}

/**
 * Invalid file error
 */
export class InvalidFileError extends ReceiptVaultError {
  constructor(reason: string) {
    super(
      `Invalid file: ${reason}`,
      'INVALID_FILE',
      400
    );
  }
}

/**
 * File size exceeded error
 */
export class FileSizeExceededError extends ReceiptVaultError {
  constructor(fileSize: number, maxSize: number) {
    super(
      `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      'FILE_SIZE_EXCEEDED',
      413
    );
  }
}

/**
 * Invalid MIME type error
 */
export class InvalidMimeTypeError extends ReceiptVaultError {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      `MIME type "${mimeType}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      'INVALID_MIME_TYPE',
      400
    );
  }
}

/**
 * Invalid storage provider error
 */
export class InvalidStorageProviderError extends ReceiptVaultError {
  constructor(provider: string) {
    super(
      `Invalid storage provider: ${provider}`,
      'INVALID_STORAGE_PROVIDER',
      400
    );
  }
}

/**
 * Receipt validation error
 */
export class ReceiptValidationError extends ReceiptVaultError {
  constructor(field: string, message: string) {
    super(
      `Validation failed for ${field}: ${message}`,
      'RECEIPT_VALIDATION_ERROR',
      422
    );
  }
}

/**
 * Deleted receipt error
 */
export class DeletedReceiptError extends ReceiptVaultError {
  constructor(receiptId: string) {
    super(
      `Receipt ${receiptId} has been deleted`,
      'DELETED_RECEIPT',
      410
    );
  }
}
