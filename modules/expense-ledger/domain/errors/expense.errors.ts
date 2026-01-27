/**
 * Base error class for Expense Ledger module
 */
export class ExpenseLedgerError extends Error {
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
 * Expense-related errors
 */
export class ExpenseNotFoundError extends ExpenseLedgerError {
  constructor(expenseId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Expense with ID ${expenseId} not found in workspace ${workspaceId}`
      : `Expense with ID ${expenseId} not found`;
    super(message, 'EXPENSE_NOT_FOUND', 404);
  }
}

export class UnauthorizedExpenseAccessError extends ExpenseLedgerError {
  constructor(expenseId: string, userId: string, operation: string = 'access') {
    super(
      `User ${userId} is unauthorized to ${operation} expense ${expenseId}`,
      'UNAUTHORIZED_EXPENSE_ACCESS',
      403
    );
  }
}

export class InvalidExpenseStatusError extends ExpenseLedgerError {
  constructor(expenseId: string, currentStatus: string, operation: string) {
    super(
      `Cannot ${operation} expense ${expenseId} with status ${currentStatus}`,
      'INVALID_EXPENSE_STATUS',
      400
    );
  }
}

export class InvalidExpenseDataError extends ExpenseLedgerError {
  constructor(field: string, reason: string) {
    super(
      `Invalid expense data for field '${field}': ${reason}`,
      'INVALID_EXPENSE_DATA',
      400
    );
  }
}

export class ExpenseAlreadyExistsError extends ExpenseLedgerError {
  constructor(identifier: string) {
    super(
      `Expense with identifier ${identifier} already exists`,
      'EXPENSE_ALREADY_EXISTS',
      409
    );
  }
}

/**
 * Category-related errors
 */
export class CategoryNotFoundError extends ExpenseLedgerError {
  constructor(categoryId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Category with ID ${categoryId} not found in workspace ${workspaceId}`
      : `Category with ID ${categoryId} not found`;
    super(message, 'CATEGORY_NOT_FOUND', 404);
  }
}

export class CategoryAlreadyExistsError extends ExpenseLedgerError {
  constructor(name: string, workspaceId: string) {
    super(
      `Category with name '${name}' already exists in workspace ${workspaceId}`,
      'CATEGORY_ALREADY_EXISTS',
      409
    );
  }
}

export class CategoryInUseError extends ExpenseLedgerError {
  constructor(categoryId: string, expenseCount: number) {
    super(
      `Cannot delete category ${categoryId} as it is used by ${expenseCount} expense(s). ` +
      `Please reassign or delete those expenses first.`,
      'CATEGORY_IN_USE',
      409
    );
  }
}

/**
 * Tag-related errors
 */
export class TagNotFoundError extends ExpenseLedgerError {
  constructor(tagId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Tag with ID ${tagId} not found in workspace ${workspaceId}`
      : `Tag with ID ${tagId} not found`;
    super(message, 'TAG_NOT_FOUND', 404);
  }
}

export class TagAlreadyExistsError extends ExpenseLedgerError {
  constructor(name: string, workspaceId: string) {
    super(
      `Tag with name '${name}' already exists in workspace ${workspaceId}`,
      'TAG_ALREADY_EXISTS',
      409
    );
  }
}

export class TagAlreadyAssignedError extends ExpenseLedgerError {
  constructor(tagId: string, expenseId: string) {
    super(
      `Tag ${tagId} is already assigned to expense ${expenseId}`,
      'TAG_ALREADY_ASSIGNED',
      409
    );
  }
}

/**
 * Attachment-related errors
 */
export class AttachmentNotFoundError extends ExpenseLedgerError {
  constructor(attachmentId: string) {
    super(
      `Attachment with ID ${attachmentId} not found`,
      'ATTACHMENT_NOT_FOUND',
      404
    );
  }
}

export class AttachmentUploadError extends ExpenseLedgerError {
  constructor(reason: string) {
    super(
      `Failed to upload attachment: ${reason}`,
      'ATTACHMENT_UPLOAD_ERROR',
      500
    );
  }
}

export class InvalidFileTypeError extends ExpenseLedgerError {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      `Invalid file type '${mimeType}'. Allowed types: ${allowedTypes.join(', ')}`,
      'INVALID_FILE_TYPE',
      400
    );
  }
}

export class FileSizeLimitExceededError extends ExpenseLedgerError {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${size} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      'FILE_SIZE_LIMIT_EXCEEDED',
      400
    );
  }
}

/**
 * Recurring expense errors
 */
export class RecurringExpenseNotFoundError extends ExpenseLedgerError {
  constructor(recurringExpenseId: string) {
    super(
      `Recurring expense with ID ${recurringExpenseId} not found`,
      'RECURRING_EXPENSE_NOT_FOUND',
      404
    );
  }
}

export class InvalidRecurrencePatternError extends ExpenseLedgerError {
  constructor(reason: string) {
    super(
      `Invalid recurrence pattern: ${reason}`,
      'INVALID_RECURRENCE_PATTERN',
      400
    );
  }
}
