import { WorkflowService } from '../services/workflow.service';
import { OperationService } from '../services/operation.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListPendingApprovalsQuery extends IQuery {
  readonly actorId: string;
  readonly approverId?: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly authToken?: string;
}

export class ListPendingApprovalsHandler implements IQueryHandler<
  ListPendingApprovalsQuery,
  PaginatedResult<ExpenseWorkflowDTO>
> {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly operations: OperationService
  ) {}

  async handle(query: ListPendingApprovalsQuery): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    const targetApproverId = query.approverId ?? query.actorId;
    await this.operations.authorizeUserLookup(
      query.actorId,
      query.workspaceId,
      targetApproverId,
      query.authToken
    );

    return this.workflowService.listPendingApprovals(
      targetApproverId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
