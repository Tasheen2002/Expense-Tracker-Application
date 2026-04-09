import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ListUserWorkflowsInput extends IQuery {
  userId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListUserWorkflowsHandler implements IQueryHandler<
  ListUserWorkflowsInput,
  PaginatedResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: ListUserWorkflowsInput): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    return this.workflowService.listUserWorkflows(
      input.userId,
      input.workspaceId,
      { limit: input.limit, offset: input.offset }
    );
  }
}
