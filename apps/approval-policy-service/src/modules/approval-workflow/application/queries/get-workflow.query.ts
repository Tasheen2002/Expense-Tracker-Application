import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetWorkflowQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class GetWorkflowHandler implements IQueryHandler<
  GetWorkflowQuery,
  ExpenseWorkflowDTO
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(query: GetWorkflowQuery): Promise<ExpenseWorkflowDTO> {
    return this.workflowService.getWorkflow(query.expenseId, query.workspaceId);
  }
}
