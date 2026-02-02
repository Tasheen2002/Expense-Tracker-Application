import { DomainError } from "../../../../apps/api/src/shared/domain/domain-error";

/**
 * Base error class for Expense Ledger module
 */
export class ExpenseLedgerError extends DomainError {
  constructor(
    message: string,
    public readonly code: string,
    statusCode: number = 400,
  ) {
    super(message, statusCode);
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
    super(message, "EXPENSE_NOT_FOUND", 404);
  }
}

export class UnauthorizedExpenseAccessError extends ExpenseLedgerError {
  constructor(expenseId: string, userId: string, operation: string = "access") {
    super(
      `User ${userId} is unauthorized to ${operation} expense ${expenseId}`,
      "UNAUTHORIZED_EXPENSE_ACCESS",
      403,
    );
  }
}

export class InvalidExpenseStatusError extends ExpenseLedgerError {
  constructor(expenseId: string, currentStatus: string, operation: string) {
    super(
      `Cannot ${operation} expense ${expenseId} with status ${currentStatus}`,
      "INVALID_EXPENSE_STATUS",
      400,
    );
  }
}

export class InvalidExpenseDataError extends ExpenseLedgerError {
  constructor(field: string, reason: string) {
    super(
      `Invalid expense data for field '${field}': ${reason}`,
      "INVALID_EXPENSE_DATA",
      400,
    );
  }
}

export class ExpenseAlreadyExistsError extends ExpenseLedgerError {
  constructor(identifier: string) {
    super(
      `Expense with identifier ${identifier} already exists`,
      "EXPENSE_ALREADY_EXISTS",
      409,
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
    super(message, "CATEGORY_NOT_FOUND", 404);
  }
}

export class CategoryAlreadyExistsError extends ExpenseLedgerError {
  constructor(name: string, workspaceId: string) {
    super(
      `Category with name '${name}' already exists in workspace ${workspaceId}`,
      "CATEGORY_ALREADY_EXISTS",
      409,
    );
  }
}

export class CategoryInUseError extends ExpenseLedgerError {
  constructor(categoryId: string, expenseCount: number) {
    super(
      `Cannot delete category ${categoryId} as it is used by ${expenseCount} expense(s). ` +
        `Please reassign or delete those expenses first.`,
      "CATEGORY_IN_USE",
      409,
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
    super(message, "TAG_NOT_FOUND", 404);
  }
}

export class TagAlreadyExistsError extends ExpenseLedgerError {
  constructor(name: string, workspaceId: string) {
    super(
      `Tag with name '${name}' already exists in workspace ${workspaceId}`,
      "TAG_ALREADY_EXISTS",
      409,
    );
  }
}

export class TagAlreadyAssignedError extends ExpenseLedgerError {
  constructor(tagId: string, expenseId: string) {
    super(
      `Tag ${tagId} is already assigned to expense ${expenseId}`,
      "TAG_ALREADY_ASSIGNED",
      409,
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
      "ATTACHMENT_NOT_FOUND",
      404,
    );
  }
}

export class AttachmentUploadError extends ExpenseLedgerError {
  constructor(reason: string) {
    super(
      `Failed to upload attachment: ${reason}`,
      "ATTACHMENT_UPLOAD_ERROR",
      500,
    );
  }
}

export class InvalidFileTypeError extends ExpenseLedgerError {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      `Invalid file type '${mimeType}'. Allowed types: ${allowedTypes.join(", ")}`,
      "INVALID_FILE_TYPE",
      400,
    );
  }
}

export class FileSizeLimitExceededError extends ExpenseLedgerError {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${size} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      "FILE_SIZE_LIMIT_EXCEEDED",
      400,
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
      "RECURRING_EXPENSE_NOT_FOUND",
      404,
    );
  }
}

export class InvalidRecurrencePatternError extends ExpenseLedgerError {
  constructor(reason: string) {
    super(
      `Invalid recurrence pattern: ${reason}`,
      "INVALID_RECURRENCE_PATTERN",
      400,
    );
  }
}

// --- Tag Errors ---
export class TagNameRequiredError extends ExpenseLedgerError {
  constructor() {
    super("Tag name is required", "TAG_NAME_REQUIRED", 400);
  }
}

export class TagNameTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `Tag name cannot exceed ${maxLength} characters`,
      "TAG_NAME_TOO_LONG",
      400,
    );
  }
}

export class InvalidHexColorError extends ExpenseLedgerError {
  constructor(color: string) {
    super(
      `Color must be a valid hex color code (e.g., #FFFFFF), got: ${color}`,
      "INVALID_HEX_COLOR",
      400,
    );
  }
}

// --- Category Errors ---
export class CategoryNameRequiredError extends ExpenseLedgerError {
  constructor() {
    super("Category name is required", "CATEGORY_NAME_REQUIRED", 400);
  }
}

export class CategoryNameTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `Category name cannot exceed ${maxLength} characters`,
      "CATEGORY_NAME_TOO_LONG",
      400,
    );
  }
}

export class CategoryDescriptionTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `Category description cannot exceed ${maxLength} characters`,
      "CATEGORY_DESCRIPTION_TOO_LONG",
      400,
    );
  }
}

export class IconNameTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `Icon name cannot exceed ${maxLength} characters`,
      "ICON_NAME_TOO_LONG",
      400,
    );
  }
}

// --- Expense Errors ---
export class ExpenseTitleRequiredError extends ExpenseLedgerError {
  constructor() {
    super("Expense title is required", "EXPENSE_TITLE_REQUIRED", 400);
  }
}

export class ExpenseTitleTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `Expense title cannot exceed ${maxLength} characters`,
      "EXPENSE_TITLE_TOO_LONG",
      400,
    );
  }
}

export class ExpenseDescriptionTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `Expense description cannot exceed ${maxLength} characters`,
      "EXPENSE_DESCRIPTION_TOO_LONG",
      400,
    );
  }
}

export class MerchantNameTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `Merchant name cannot exceed ${maxLength} characters`,
      "MERCHANT_NAME_TOO_LONG",
      400,
    );
  }
}

export class InvalidExpenseDateError extends ExpenseLedgerError {
  constructor(reason: string) {
    super(`Invalid expense date: ${reason}`, "INVALID_EXPENSE_DATE", 400);
  }
}

export class NonReimbursableError extends ExpenseLedgerError {
  constructor(expenseId: string) {
    super(
      `Cannot reimburse a non-reimbursable expense ${expenseId}`,
      "NON_REIMBURSABLE_EXPENSE",
      400,
    );
  }
}

// --- Attachment Errors ---
export class FileNameRequiredError extends ExpenseLedgerError {
  constructor() {
    super("File name is required", "FILE_NAME_REQUIRED", 400);
  }
}

export class FileNameTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `File name cannot exceed ${maxLength} characters`,
      "FILE_NAME_TOO_LONG",
      400,
    );
  }
}

export class FilePathRequiredError extends ExpenseLedgerError {
  constructor() {
    super("File path is required", "FILE_PATH_REQUIRED", 400);
  }
}

export class FilePathTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `File path cannot exceed ${maxLength} characters`,
      "FILE_PATH_TOO_LONG",
      400,
    );
  }
}

export class FileSizeInvalidError extends ExpenseLedgerError {
  constructor() {
    super("File size must be greater than 0", "FILE_SIZE_INVALID", 400);
  }
}

export class MimeTypeRequiredError extends ExpenseLedgerError {
  constructor() {
    super("MIME type is required", "MIME_TYPE_REQUIRED", 400);
  }
}

export class MimeTypeTooLongError extends ExpenseLedgerError {
  constructor(maxLength: number) {
    super(
      `MIME type cannot exceed ${maxLength} characters`,
      "MIME_TYPE_TOO_LONG",
      400,
    );
  }
}

export class CurrencyRequiredError extends ExpenseLedgerError {
  constructor() {
    super(
      "Currency is required for financial aggregations to prevent mixing currencies",
      "CURRENCY_REQUIRED",
      400,
    );
  }
}
