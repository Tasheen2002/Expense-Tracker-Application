import { ExpenseWorkflow } from '../entities/expense-workflow.entity';
import { WorkflowId } from '../value-objects';
import { ExpenseId, WorkspaceId, UserId } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IExpenseWorkflowRepository {
  save(workflow: ExpenseWorkflow): Promise<void>;
  findById(workflowId: WorkflowId): Promise<ExpenseWorkflow | null>;
  findByExpenseId(expenseId: ExpenseId): Promise<ExpenseWorkflow | null>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
  findPendingByApproverId(
    approverId: UserId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
  findByUserId(
    userId: UserId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>>;
  exists(workflowId: WorkflowId): Promise<boolean>;
  countByWorkspaceId(workspaceId: WorkspaceId): Promise<number>;
}
