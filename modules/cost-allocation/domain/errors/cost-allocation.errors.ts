import { DomainError } from "../../../../apps/api/src/shared/domain/domain-error";

export class CostAllocationDomainError extends DomainError {
  public readonly errorCode: string;

  constructor(message: string, errorCode: string, statusCode: number) {
    super(message, statusCode);
    this.errorCode = errorCode;
  }
}

export class InvalidAllocationAmountError extends CostAllocationDomainError {
  constructor(amount: number) {
    super(
      `Invalid allocation amount: ${amount}. Amount must be greater than 0.`,
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

export class ExpenseWorkspaceMismatchError extends CostAllocationDomainError {
  constructor(expenseId: string, workspaceId: string) {
    super(
      `Expense ${expenseId} does not belong to workspace ${workspaceId}`,
      "EXPENSE_WORKSPACE_MISMATCH",
      403,
    );
  }
}

export class InvalidAllocationTargetError extends CostAllocationDomainError {
  constructor(message: string) {
    super(message, "INVALID_ALLOCATION_TARGET", 400);
  }
}

export class AllocationExceedsExpenseError extends CostAllocationDomainError {
  constructor(message: string) {
    super(message, "ALLOCATION_EXCEEDS_EXPENSE", 400);
  }
}

export class UnauthorizedAllocationAccessError extends CostAllocationDomainError {
  constructor(action: string) {
    super(
      `You are not authorized to ${action} allocations for this expense.`,
      "UNAUTHORIZED_ALLOCATION_ACCESS",
      403,
    );
  }
}
