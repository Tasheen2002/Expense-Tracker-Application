import { RuleExecutionService } from '../services/rule-execution.service';
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { RuleExecution } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetExecutionsByExpenseQuery extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetExecutionsByExpenseHandler implements IQueryHandler<
  GetExecutionsByExpenseQuery,
  QueryResult<RuleExecution[]>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    query: GetExecutionsByExpenseQuery
  ): Promise<QueryResult<RuleExecution[]>> {
    const executions = await this.executionService.getExecutionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    );

    return QueryResult.success(executions.items);
  }
}
