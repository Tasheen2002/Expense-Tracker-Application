import { DomainError } from '@core/domain/domain-error';

export class CostAllocationDomainError extends DomainError {
  constructor(message: string, errorCode: string, statusCode: number) {
    super(message, errorCode, statusCode);
  }
}

export class InvalidAllocationAmountError extends CostAllocationDomainError {
  constructor(amount: number, reason = 'Amount must be greater than 0 and fit two decimal places') {
    super(
      `Invalid allocation amount: ${amount}. ${reason}.`,
      "INVALID_ALLOCATION_AMOUNT",
      400,
    );
  }
}

export class InvalidTotalAllocationError extends CostAllocationDomainError {
  constructor(totalAllocated: number, expenseAmount: number) {
    super(
      `Invalid total allocation. Total allocated (${totalAllocated}) exceeds expense amount (${expenseAmount}).`,
      "INVALID_TOTAL_ALLOCATION",
      400,
    );
  }
}

export class DepartmentNotFoundError extends CostAllocationDomainError {
  constructor(id: string) {
    super(`Department not found with ID: ${id}`, "DEPARTMENT_NOT_FOUND", 404);
  }
}

export class CostCenterNotFoundError extends CostAllocationDomainError {
  constructor(id: string) {
    super(`Cost Center not found with ID: ${id}`, "COST_CENTER_NOT_FOUND", 404);
  }
}

export class ProjectNotFoundError extends CostAllocationDomainError {
  constructor(id: string) {
    super(`Project not found with ID: ${id}`, "PROJECT_NOT_FOUND", 404);
  }
}

export class DuplicateDepartmentCodeError extends CostAllocationDomainError {
  constructor(code: string) {
    super(
      `Department with code '${code}' already exists.`,
      "DUPLICATE_DEPARTMENT_CODE",
      409,
    );
  }
}

export class DuplicateCostCenterCodeError extends CostAllocationDomainError {
  constructor(code: string) {
    super(
      `Cost Center with code '${code}' already exists.`,
      "DUPLICATE_COST_CENTER_CODE",
      409,
    );
  }
}

export class DuplicateProjectCodeError extends CostAllocationDomainError {
  constructor(code: string) {
    super(
      `Project with code '${code}' already exists.`,
      "DUPLICATE_PROJECT_CODE",
      409,
    );
  }
}

export class ExpenseNotFoundError extends CostAllocationDomainError {
  constructor(id: string) {
    super(`Expense not found with ID: ${id}`, "EXPENSE_NOT_FOUND", 404);
  }
}

export class InvalidAllocationTargetError extends CostAllocationDomainError {
  constructor(message: string) {
    super(message, "INVALID_ALLOCATION_TARGET", 400);
  }
}

export class UnauthorizedAllocationAccessError extends CostAllocationDomainError {
  constructor(action: string) {
    super(
      `You are not authorized to ${action} in this workspace.`,
      "UNAUTHORIZED_ALLOCATION_ACCESS",
      403,
    );
  }
}

export class InvalidCodeError extends CostAllocationDomainError {
  constructor(entity: string, reason: string) {
    super(`Invalid ${entity} code: ${reason}`, "INVALID_CODE", 400);
  }
}

export class ManagementConcurrencyConflictError extends CostAllocationDomainError {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} changed since it was loaded. Reload and retry.`, 'MANAGEMENT_CONCURRENCY_CONFLICT', 409);
  }
}

export class InvalidAllocationExpenseIdError extends CostAllocationDomainError {
  constructor() {
    super('Allocation expense ID must be a valid UUID.', 'INVALID_ALLOCATION_EXPENSE_ID', 400);
  }
}

export class InvalidAllocationPercentageError extends CostAllocationDomainError {
  constructor() {
    super('Allocation percentage must be between 0 and 100 with at most two decimal places.', 'INVALID_ALLOCATION_PERCENTAGE', 400);
  }
}

export class AllocationPercentageMismatchError extends CostAllocationDomainError {
  constructor() {
    super('Allocation amount does not match its percentage of the expense total.', 'ALLOCATION_PERCENTAGE_MISMATCH', 400);
  }
}

export class InvalidAllocationNotesError extends CostAllocationDomainError {
  constructor() {
    super('Allocation notes cannot exceed 500 characters.', 'INVALID_ALLOCATION_NOTES', 400);
  }
}

export class InvalidAllocationNameError extends CostAllocationDomainError {
  constructor(entity: string) {
    super(`${entity} name must be 2 to 100 characters after trimming.`, 'INVALID_ALLOCATION_NAME', 400);
  }
}

export class InvalidManagementSortError extends CostAllocationDomainError {
  constructor(field: string) {
    super(`Unsupported management sort field: ${field}.`, 'INVALID_MANAGEMENT_SORT', 400);
  }
}

export class WorkspaceAuthorizationUnavailableError extends CostAllocationDomainError {
  constructor() {
    super('Workspace authorization is temporarily unavailable.', 'WORKSPACE_AUTHORIZATION_UNAVAILABLE', 503);
  }
}

export class InvalidDepartmentHierarchyError extends CostAllocationDomainError {
  constructor(reason: string) {
    super(`Invalid department hierarchy: ${reason}`, "INVALID_DEPARTMENT_HIERARCHY", 400);
  }
}

export class InvalidProjectError extends CostAllocationDomainError {
  constructor(reason: string) {
    super(`Invalid project: ${reason}`, "INVALID_PROJECT", 400);
  }
}
