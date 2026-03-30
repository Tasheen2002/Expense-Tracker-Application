// HTTP entry-point (used by the API app to mount routes)
export { registerBudgetRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  BudgetManagementError,
  BudgetNotFoundError,
  BudgetAlreadyExistsError,
  InvalidBudgetPeriodError,
  InvalidBudgetStatusError,
  BudgetExceededError,
  AllocationNotFoundError,
  AllocationAlreadyExistsError,
  InvalidAllocationAmountError,
  AllocationExceededError,
  AlertNotFoundError,
  SpendingLimitNotFoundError,
} from './domain/errors/budget.errors';

// Domain enums (safe to share — value objects, not entities)
export { BudgetStatus } from './domain/enums/budget-status';
export { BudgetPeriodType } from './domain/enums/budget-period-type';
export { AlertLevel } from './domain/enums/alert-level';
