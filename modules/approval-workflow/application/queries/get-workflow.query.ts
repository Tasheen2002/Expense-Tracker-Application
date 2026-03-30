import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetWorkflowInput extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetWorkflowHandler implements IQueryHandler<
  GetWorkflowInput,
  QueryResult<ExpenseWorkflow>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode;
    }
    return 500;
  }

  async handle(input: GetWorkflowInput): Promise<QueryResult<ExpenseWorkflow>> {
    try {
      const workflow = await this.workflowService.getWorkflow(
        input.expenseId,
        input.workspaceId
      );
      return QueryResult.success(workflow);
    } catch (error: unknown) {
      return QueryResult.failure(
        error instanceof Error ? error.message : 'Query failed',
        this.getStatusCode(error)
      );
    }
  }
}
