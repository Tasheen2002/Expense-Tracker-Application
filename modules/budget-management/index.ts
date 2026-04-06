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

// Application services (for DI container wiring)
export { BudgetService } from './application/services/budget.service';
export { SpendingLimitService } from './application/services/spending-limit.service';

// Command handlers
export { CreateBudgetHandler } from './application/commands/create-budget.command';
export { UpdateBudgetHandler } from './application/commands/update-budget.command';
export { ActivateBudgetHandler } from './application/commands/activate-budget.command';
export { ArchiveBudgetHandler } from './application/commands/archive-budget.command';
export { DeleteBudgetHandler } from './application/commands/delete-budget.command';
export { AddAllocationHandler } from './application/commands/add-allocation.command';
export { UpdateAllocationHandler } from './application/commands/update-allocation.command';
export { DeleteAllocationHandler } from './application/commands/delete-allocation.command';
export { CreateSpendingLimitHandler } from './application/commands/create-spending-limit.command';
export { UpdateSpendingLimitHandler } from './application/commands/update-spending-limit.command';
export { DeleteSpendingLimitHandler } from './application/commands/delete-spending-limit.command';

// Query handlers
export { GetBudgetHandler } from './application/queries/get-budget.query';
export { ListBudgetsHandler } from './application/queries/list-budgets.query';
export { GetAllocationsHandler } from './application/queries/get-allocations.query';
export { GetUnreadAlertsHandler } from './application/queries/get-unread-alerts.query';
export { GetSpendingLimitHandler } from './application/queries/get-spending-limit.query';
export { ListSpendingLimitsHandler } from './application/queries/list-spending-limits.query';
