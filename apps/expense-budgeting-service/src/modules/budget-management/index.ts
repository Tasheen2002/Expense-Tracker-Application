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

// DTO types (for cross-module type sharing)
export type { BudgetDTO } from './domain/entities/budget.entity';
export type { BudgetAllocationDTO } from './domain/entities/budget-allocation.entity';
export type { BudgetAlertDTO } from './domain/entities/budget-alert.entity';
export type { SpendingLimitDTO } from './domain/entities/spending-limit.entity';

