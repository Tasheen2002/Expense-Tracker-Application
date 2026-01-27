/**
 * Base error class for Receipt Vault domain errors
 */
export abstract class ReceiptVaultError extends Error {
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Receipt not found error
 */
export class ReceiptNotFoundError extends ReceiptVaultError {
  readonly statusCode = 404

  constructor(receiptId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Receipt with ID ${receiptId} not found in workspace ${workspaceId}`
      : `Receipt with ID ${receiptId} not found`
    super(message)
  }
}

/**
 * Invalid status transition error
 */
export class InvalidStatusTransitionError extends ReceiptVaultError {
  readonly statusCode = 400

  constructor(from: string, to: string) {
    super(`Cannot transition receipt status from ${from} to ${to}`)
  }
}

/**
 * Duplicate receipt error (based on file hash)
 */
export class DuplicateReceiptError extends ReceiptVaultError {
  readonly statusCode = 409

  constructor(fileHash: string) {
    super(`A receipt with file hash ${fileHash} already exists`)
  }
}

/**
 * Receipt metadata not found error
 */
export class ReceiptMetadataNotFoundError extends ReceiptVaultError {
  readonly statusCode = 404

  constructor(receiptId: string) {
    super(`Metadata not found for receipt ${receiptId}`)
  }
}

/**
 * Receipt metadata already exists error
 */
export class ReceiptMetadataAlreadyExistsError extends ReceiptVaultError {
  readonly statusCode = 409

  constructor(receiptId: string) {
    super(`Metadata already exists for receipt ${receiptId}`)
  }
}

/**
 * Invalid receipt operation error
 */
export class InvalidReceiptOperationError extends ReceiptVaultError {
  readonly statusCode = 400

  constructor(operation: string, reason: string) {
    super(`Cannot ${operation}: ${reason}`)
  }
}

/**
 * Receipt tag not found error
 */
export class ReceiptTagNotFoundError extends ReceiptVaultError {
  readonly statusCode = 404

  constructor(tagId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Tag with ID ${tagId} not found in workspace ${workspaceId}`
      : `Tag with ID ${tagId} not found`
    super(message)
  }
}

/**
 * Duplicate tag name error
 */
export class DuplicateTagNameError extends ReceiptVaultError {
  readonly statusCode = 409

  constructor(tagName: string, workspaceId: string) {
    super(`Tag with name "${tagName}" already exists in workspace ${workspaceId}`)
  }
}

/**
 * Invalid file error
 */
export class InvalidFileError extends ReceiptVaultError {
  readonly statusCode = 400

  constructor(reason: string) {
    super(`Invalid file: ${reason}`)
  }
}

/**
 * File size exceeded error
 */
export class FileSizeExceededError extends ReceiptVaultError {
  readonly statusCode = 413

  constructor(fileSize: number, maxSize: number) {
    super(
      `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
    )
  }
}

/**
 * Invalid MIME type error
 */
export class InvalidMimeTypeError extends ReceiptVaultError {
  readonly statusCode = 400

  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      `MIME type "${mimeType}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    )
  }
}

/**
 * Invalid storage provider error
 */
export class InvalidStorageProviderError extends ReceiptVaultError {
  readonly statusCode = 400

  constructor(provider: string) {
    super(`Invalid storage provider: ${provider}`)
  }
}

/**
 * Receipt validation error
 */
export class ReceiptValidationError extends ReceiptVaultError {
  readonly statusCode = 422

  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`)
  }
}

/**
 * Deleted receipt error
 */
export class DeletedReceiptError extends ReceiptVaultError {
  readonly statusCode = 410

  constructor(receiptId: string) {
    super(`Receipt ${receiptId} has been deleted`)
  }
}
