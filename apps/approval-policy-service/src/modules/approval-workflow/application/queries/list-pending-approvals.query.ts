import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListPendingApprovalsQuery extends IQuery {
  readonly approverId: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListPendingApprovalsHandler implements IQueryHandler<
  ListPendingApprovalsQuery,
  PaginatedResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(query: ListPendingApprovalsQuery): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    return this.workflowService.listPendingApprovals(
      query.approverId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
