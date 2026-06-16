import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ListUserWorkflowsQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListUserWorkflowsHandler implements IQueryHandler<
  ListUserWorkflowsQuery,
  PaginatedResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(query: ListUserWorkflowsQuery): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    return this.workflowService.listUserWorkflows(
      query.userId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
