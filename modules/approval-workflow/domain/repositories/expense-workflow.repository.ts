import { ExpenseWorkflow } from "../entities/expense-workflow.entity";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ExpenseWorkflowRepository {
  save(workflow: ExpenseWorkflow): Promise<void>;
  findByExpenseId(expenseId: string): Promise<ExpenseWorkflow | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
  findPendingByApprover(
    approverId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
  findByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
}
