export { registerCostAllocationRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  CostAllocationDomainError,
  DepartmentNotFoundError,
  CostCenterNotFoundError,
  ProjectNotFoundError,
  AllocationNotFoundError,
  InvalidAllocationDataError,
  DuplicateDepartmentNameError,
  DuplicateCostCenterCodeError,
  DuplicateProjectCodeError,
  UnauthorizedAllocationAccessError,
  InvalidTotalAllocationError,
  InvalidAllocationAmountError,
  InvalidAllocationTargetError,
  ExpenseNotFoundError,
  ExpenseWorkspaceMismatchError,
} from './domain/errors/cost-allocation.errors';

// Domain enums (None found in previous research, but if any exist, they should be here)
