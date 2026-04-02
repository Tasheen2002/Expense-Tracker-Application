import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface ListPendingApprovalsInput extends IQuery {
  approverId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListPendingApprovalsHandler implements IQueryHandler<
  ListPendingApprovalsInput,
  QueryResult<PaginatedResult<ExpenseWorkflow>>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode;
    }
    return 500;
  }

  async handle(
    input: ListPendingApprovalsInput
  ): Promise<QueryResult<PaginatedResult<ExpenseWorkflow>>> {
    try {
      const result = await this.workflowService.listPendingApprovals(
        input.approverId,
        input.workspaceId,
        { limit: input.limit, offset: input.offset }
      );
      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.failure(
        error instanceof Error ? error.message : 'Query failed',
        this.getStatusCode(error)
      );
    }
  }
}
