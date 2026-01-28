import { ExpenseSplit } from "../entities/expense-split.entity";
import { SplitId } from "../value-objects/split-id";
import { ExpenseId } from "../value-objects/expense-id";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ExpenseSplitRepository {
  save(split: ExpenseSplit): Promise<void>;
  findById(id: SplitId, workspaceId: string): Promise<ExpenseSplit | null>;
  findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: string,
  ): Promise<ExpenseSplit | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseSplit>>;
  findByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseSplit>>;
  findByPaidBy(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseSplit>>;
  delete(id: SplitId, workspaceId: string): Promise<void>;
  exists(expenseId: ExpenseId, workspaceId: string): Promise<boolean>;
}
