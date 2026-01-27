/**
 * Base error class for Expense Ledger module
 */
export abstract class ExpenseLedgerError extends Error {
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Expense-related errors
 */
export class ExpenseNotFoundError extends ExpenseLedgerError {
  readonly statusCode = 404

  constructor(expenseId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Expense with ID ${expenseId} not found in workspace ${workspaceId}`
      : `Expense with ID ${expenseId} not found`
    super(message)
  }
}

export class UnauthorizedExpenseAccessError extends ExpenseLedgerError {
  readonly statusCode = 403

  constructor(expenseId: string, userId: string, operation: string = 'access') {
    super(`User ${userId} is unauthorized to ${operation} expense ${expenseId}`)
  }
}

export class InvalidExpenseStatusError extends ExpenseLedgerError {
  readonly statusCode = 400

  constructor(expenseId: string, currentStatus: string, operation: string) {
    super(`Cannot ${operation} expense ${expenseId} with status ${currentStatus}`)
  }
}

export class InvalidExpenseDataError extends ExpenseLedgerError {
  readonly statusCode = 400

  constructor(field: string, reason: string) {
    super(`Invalid expense data for field '${field}': ${reason}`)
  }
}

export class ExpenseAlreadyExistsError extends ExpenseLedgerError {
  readonly statusCode = 409

  constructor(identifier: string) {
    super(`Expense with identifier ${identifier} already exists`)
  }
}

/**
 * Category-related errors
 */
export class CategoryNotFoundError extends ExpenseLedgerError {
  readonly statusCode = 404

  constructor(categoryId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Category with ID ${categoryId} not found in workspace ${workspaceId}`
      : `Category with ID ${categoryId} not found`
    super(message)
  }
}

export class CategoryAlreadyExistsError extends ExpenseLedgerError {
  readonly statusCode = 409

  constructor(name: string, workspaceId: string) {
    super(`Category with name '${name}' already exists in workspace ${workspaceId}`)
  }
}

export class CategoryInUseError extends ExpenseLedgerError {
  readonly statusCode = 409

  constructor(categoryId: string, expenseCount: number) {
    super(
      `Cannot delete category ${categoryId} as it is used by ${expenseCount} expense(s). ` +
      `Please reassign or delete those expenses first.`
    )
  }
}

/**
 * Tag-related errors
 */
export class TagNotFoundError extends ExpenseLedgerError {
  readonly statusCode = 404

  constructor(tagId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Tag with ID ${tagId} not found in workspace ${workspaceId}`
      : `Tag with ID ${tagId} not found`
    super(message)
  }
}

export class TagAlreadyExistsError extends ExpenseLedgerError {
  readonly statusCode = 409

  constructor(name: string, workspaceId: string) {
    super(`Tag with name '${name}' already exists in workspace ${workspaceId}`)
  }
}

export class TagAlreadyAssignedError extends ExpenseLedgerError {
  readonly statusCode = 409

  constructor(tagId: string, expenseId: string) {
    super(`Tag ${tagId} is already assigned to expense ${expenseId}`)
  }
}

/**
 * Attachment-related errors
 */
export class AttachmentNotFoundError extends ExpenseLedgerError {
  readonly statusCode = 404

  constructor(attachmentId: string) {
    super(`Attachment with ID ${attachmentId} not found`)
  }
}

export class AttachmentUploadError extends ExpenseLedgerError {
  readonly statusCode = 500

  constructor(reason: string) {
    super(`Failed to upload attachment: ${reason}`)
  }
}

export class InvalidFileTypeError extends ExpenseLedgerError {
  readonly statusCode = 400

  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      `Invalid file type '${mimeType}'. Allowed types: ${allowedTypes.join(', ')}`
    )
  }
}

export class FileSizeLimitExceededError extends ExpenseLedgerError {
  readonly statusCode = 400

  constructor(size: number, maxSize: number) {
    super(
      `File size ${size} bytes exceeds maximum allowed size of ${maxSize} bytes`
    )
  }
}

/**
 * Recurring expense errors
 */
export class RecurringExpenseNotFoundError extends ExpenseLedgerError {
  readonly statusCode = 404

  constructor(recurringExpenseId: string) {
    super(`Recurring expense with ID ${recurringExpenseId} not found`)
  }
}

export class InvalidRecurrencePatternError extends ExpenseLedgerError {
  readonly statusCode = 400

  constructor(reason: string) {
    super(`Invalid recurrence pattern: ${reason}`)
  }
}
