import { ExpenseWorkflow } from '../entities/expense-workflow.entity';
import { WorkflowId } from '../value-objects/workflow-id';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IExpenseWorkflowRepository {
  save(workflow: ExpenseWorkflow): Promise<void>;
  findById(workflowId: WorkflowId): Promise<ExpenseWorkflow | null>;
  findByExpenseId(expenseId: string): Promise<ExpenseWorkflow | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
  findPendingByApprover(
    approverId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
  findByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
}
