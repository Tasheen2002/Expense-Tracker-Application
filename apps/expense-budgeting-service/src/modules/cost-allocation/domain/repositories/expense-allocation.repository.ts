import { ExpenseAllocation } from "../entities/expense-allocation.entity";
import {  WorkspaceId  } from '@core/domain/value-objects';

export interface IExpenseAllocationRepository {
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
