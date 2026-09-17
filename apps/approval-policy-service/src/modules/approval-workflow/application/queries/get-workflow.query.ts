import { WorkflowService } from '../services/workflow.service';
import { OperationService } from '../services/operation.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetWorkflowQuery extends IQuery {
  readonly actorId: string;
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export class GetWorkflowHandler implements IQueryHandler<
  GetWorkflowQuery,
  ExpenseWorkflowDTO
> {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly operations: OperationService
  ) {}

  async handle(query: GetWorkflowQuery): Promise<ExpenseWorkflowDTO> {
    const membership = await this.operations.authorize({
      actorId: query.actorId,
      workspaceId: query.workspaceId,
      authToken: query.authToken,
    });
    const workflow = await this.workflowService.getWorkflow(query.expenseId, query.workspaceId);
    this.operations.authorizeWorkflowVisibility(query.actorId, membership, workflow);
    return workflow;
  }
}
