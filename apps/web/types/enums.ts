// ============================================================================
// Enums - Matching Backend Prisma Schema
// ============================================================================

// Expense Ledger Enums
export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  OTHER = 'OTHER',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REIMBURSED = 'REIMBURSED',
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum RecurrenceStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export enum SplitType {
  EQUAL = 'EQUAL',
  EXACT = 'EXACT',
  PERCENTAGE = 'PERCENTAGE',
}

export enum SettlementStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  SETTLED = 'SETTLED',
}

// Budget Management Enums
export enum BudgetPeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum BudgetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  EXCEEDED = 'EXCEEDED',
}

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EXCEEDED = 'EXCEEDED',
}

// Approval Workflow Enums
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELEGATED = 'DELEGATED',
  AUTO_APPROVED = 'AUTO_APPROVED',
}

export enum WorkflowStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// Receipt Vault Enums
export enum ReceiptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ReceiptType {
  EXPENSE = 'EXPENSE',
  INVOICE = 'INVOICE',
  BILL = 'BILL',
  TICKET = 'TICKET',
  OTHER = 'OTHER',
}

export enum StorageProvider {
  LOCAL = 'LOCAL',
  S3 = 'S3',
  AZURE_BLOB = 'AZURE_BLOB',
  GCS = 'GCS',
}

// Notification Enums
export enum NotificationType {
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  BUDGET_ALERT = 'BUDGET_ALERT',
  INVITATION = 'INVITATION',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

// Categorization Rules Enums
export enum RuleConditionType {
  MERCHANT_CONTAINS = 'MERCHANT_CONTAINS',
  MERCHANT_EQUALS = 'MERCHANT_EQUALS',
  AMOUNT_GREATER_THAN = 'AMOUNT_GREATER_THAN',
  AMOUNT_LESS_THAN = 'AMOUNT_LESS_THAN',
  AMOUNT_EQUALS = 'AMOUNT_EQUALS',
  DESCRIPTION_CONTAINS = 'DESCRIPTION_CONTAINS',
  PAYMENT_METHOD_EQUALS = 'PAYMENT_METHOD_EQUALS',
}

// Budget Planning Enums
export enum ForecastType {
  BASELINE = 'BASELINE',
  OPTIMISTIC = 'OPTIMISTIC',
  PESSIMISTIC = 'PESSIMISTIC',
  CUSTOM = 'CUSTOM',
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// Policy Controls Enums
export enum PolicyType {
  SPENDING_LIMIT = 'SPENDING_LIMIT',
  DAILY_LIMIT = 'DAILY_LIMIT',
  WEEKLY_LIMIT = 'WEEKLY_LIMIT',
  MONTHLY_LIMIT = 'MONTHLY_LIMIT',
  CATEGORY_RESTRICTION = 'CATEGORY_RESTRICTION',
  MERCHANT_BLACKLIST = 'MERCHANT_BLACKLIST',
  TIME_RESTRICTION = 'TIME_RESTRICTION',
  RECEIPT_REQUIRED = 'RECEIPT_REQUIRED',
  DESCRIPTION_REQUIRED = 'DESCRIPTION_REQUIRED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
}

export enum ViolationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ViolationStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  EXEMPTED = 'EXEMPTED',
  OVERRIDDEN = 'OVERRIDDEN',
}

export enum ExemptionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

// Bank Feed Sync Enums
export enum ConnectionStatus {
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  EXPIRED = 'EXPIRED',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  IMPORTED = 'IMPORTED',
  IGNORED = 'IGNORED',
  DUPLICATE = 'DUPLICATE',
}

// Event Outbox Enums
export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}
