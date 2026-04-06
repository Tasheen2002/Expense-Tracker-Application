export { registerCostAllocationRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  CostAllocationDomainError,
  DepartmentNotFoundError,
  CostCenterNotFoundError,
  ProjectNotFoundError,
  DuplicateDepartmentCodeError,
  DuplicateCostCenterCodeError,
  DuplicateProjectCodeError,
  UnauthorizedAllocationAccessError,
  InvalidTotalAllocationError,
  InvalidAllocationAmountError,
  InvalidAllocationTargetError,
  AllocationExceedsExpenseError,
  ExpenseNotFoundError,
  ExpenseWorkspaceMismatchError,
  InvalidCodeError,
} from './domain/errors/cost-allocation.errors';

// Domain enums (None found in previous research, but if any exist, they should be here)
