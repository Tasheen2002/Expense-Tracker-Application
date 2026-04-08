import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetWorkflowInput extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetWorkflowHandler implements IQueryHandler<
  GetWorkflowInput,
  QueryResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: GetWorkflowInput): Promise<QueryResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.getWorkflow(
      input.expenseId,
      input.workspaceId
    );
    return QueryResult.success(workflow);
  }
}
