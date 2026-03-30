/**
 * Expense Ledger Module — Public API
 *
 * Only symbols exported from this file form the stable public interface of
 * the expense-ledger bounded context.  All other paths inside this module are
 * considered internal implementation details and must NOT be imported directly
 * by other modules or application layers.
 */

// HTTP entry-point (used by the API app to mount routes)
export { registerExpenseLedgerRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  ExpenseNotFoundError,
  CategoryNotFoundError,
  CategoryInUseError,
  TagNotFoundError,
  AttachmentNotFoundError,
} from './domain/errors/expense.errors';

export { SplitNotFoundError } from './domain/errors/split-expense.errors';

// Domain enums (safe to share — value objects, not entities)
export { ExpenseStatus } from './domain/enums/expense-status';
export { SplitType } from './domain/enums/split-type';
export { SettlementStatus } from './domain/enums/settlement-status';
export { RecurrenceFrequency } from './domain/enums/recurrence-frequency';

// Shared Value Objects (safe to consume by other modules)
export { ExpenseId } from './domain/value-objects/expense-id';
export { CategoryId } from './domain/value-objects/category-id';
