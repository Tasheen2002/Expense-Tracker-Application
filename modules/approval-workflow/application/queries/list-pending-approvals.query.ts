import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ListPendingApprovalsInput extends IQuery {
  approverId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListPendingApprovalsHandler implements IQueryHandler<
  ListPendingApprovalsInput,
  PaginatedResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: ListPendingApprovalsInput): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    return this.workflowService.listPendingApprovals(
      input.approverId,
      input.workspaceId,
      { limit: input.limit, offset: input.offset }
    );
  }
}
