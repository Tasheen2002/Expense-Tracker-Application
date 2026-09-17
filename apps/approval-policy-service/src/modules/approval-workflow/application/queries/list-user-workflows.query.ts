import { WorkflowService } from '../services/workflow.service';
import { OperationService } from '../services/operation.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListUserWorkflowsQuery extends IQuery {
  readonly actorId: string;
  readonly userId?: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly authToken?: string;
}

export class ListUserWorkflowsHandler implements IQueryHandler<
  ListUserWorkflowsQuery,
  PaginatedResult<ExpenseWorkflowDTO>
> {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly operations: OperationService
  ) {}

  async handle(query: ListUserWorkflowsQuery): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    const targetUserId = query.userId ?? query.actorId;
    await this.operations.authorizeUserLookup(
      query.actorId,
      query.workspaceId,
      targetUserId,
      query.authToken
    );

    return this.workflowService.listUserWorkflows(
      targetUserId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
