import { ExpenseAllocation } from "../entities/expense-allocation.entity";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";

export interface ExpenseAllocationRepository {
  save(allocation: ExpenseAllocation): Promise<void>;
  saveBatch(allocations: ExpenseAllocation[]): Promise<void>;
  findByExpenseId(
    expenseId: string,
    workspaceId: WorkspaceId,
  ): Promise<ExpenseAllocation[]>;
  deleteByExpenseId(expenseId: string, workspaceId: WorkspaceId): Promise<void>;
  replaceAllocs(
    expenseId: string,
    workspaceId: WorkspaceId,
    newAllocations: ExpenseAllocation[],
  ): Promise<void>;
}
