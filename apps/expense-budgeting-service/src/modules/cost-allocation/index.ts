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

// DTOs (type-only exports — safe for cross-module consumption)
export type { ExpenseAllocationDTO } from './domain/entities/expense-allocation.entity';
export type { CostCenterDTO } from './domain/entities/cost-center.entity';
export type { DepartmentDTO } from './domain/entities/department.entity';
export type { ProjectDTO } from './domain/entities/project.entity';

// Value objects (safe to consume by other modules)
export { AllocationId } from './domain/value-objects/allocation-id';
export { CostCenterId } from './domain/value-objects/cost-center-id';
export { DepartmentId } from './domain/value-objects/department-id';
export { ProjectId } from './domain/value-objects/project-id';
