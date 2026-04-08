import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface ListUserWorkflowsInput extends IQuery {
  userId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListUserWorkflowsHandler implements IQueryHandler<
  ListUserWorkflowsInput,
  QueryResult<PaginatedResult<ExpenseWorkflowDTO>>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(
    input: ListUserWorkflowsInput
  ): Promise<QueryResult<PaginatedResult<ExpenseWorkflowDTO>>> {
    const result = await this.workflowService.listUserWorkflows(
      input.userId,
      input.workspaceId,
      { limit: input.limit, offset: input.offset }
    );
    return QueryResult.success(result);
  }
}
