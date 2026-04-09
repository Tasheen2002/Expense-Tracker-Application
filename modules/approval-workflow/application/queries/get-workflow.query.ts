import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetWorkflowInput extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetWorkflowHandler implements IQueryHandler<
  GetWorkflowInput,
  ExpenseWorkflowDTO
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: GetWorkflowInput): Promise<ExpenseWorkflowDTO> {
    return this.workflowService.getWorkflow(input.expenseId, input.workspaceId);
  }
}
