/**
 * Expense Ledger Module Event Names
 * Standardized outbox event type strings matching approval-policy-service pattern.
 */
export const EXPENSE_EVENTS = {
  // Expense Lifecycle Events
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_SUBMITTED: 'expense.submitted',
  EXPENSE_APPROVED: 'expense.approved',
  EXPENSE_REJECTED: 'expense.rejected',
  EXPENSE_REIMBURSED: 'expense.reimbursed',
  EXPENSE_STATUS_CHANGED: 'expense.status_changed',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_DELETED: 'expense.deleted',

  // Attachment Events
  ATTACHMENT_ADDED: 'expense.attachment_added',
  ATTACHMENT_REMOVED: 'expense.attachment_removed',

  // Category Events
  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',

  // Tag Events
  TAG_CREATED: 'tag.created',
  TAG_UPDATED: 'tag.updated',
  TAG_DELETED: 'tag.deleted',

  // Split Events
  SPLIT_CREATED: 'expense_split.created',
  SPLIT_DELETED: 'expense_split.deleted',
  SPLIT_SETTLED: 'expense_split.settled',
  SETTLEMENT_RECORDED: 'expense.settlement_recorded',

  // Recurring Expense Events
  RECURRING_CREATED: 'recurring_expense.created',
  RECURRING_STATUS_CHANGED: 'recurring_expense.status_changed',
  RECURRING_UPDATED: 'recurring_expense.updated',
  RECURRING_DELETED: 'recurring_expense.deleted',
} as const;

export type ExpenseEventType = (typeof EXPENSE_EVENTS)[keyof typeof EXPENSE_EVENTS];
