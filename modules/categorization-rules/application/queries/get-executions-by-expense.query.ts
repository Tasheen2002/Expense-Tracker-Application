import { RuleExecutionService } from '../services/rule-execution.service';
import { ExpenseId } from '../../../expense-ledger';
import { WorkspaceId } from '../../../identity-workspace';
import { RuleExecution, RuleExecutionDTO } from '../../domain/entities/rule-execution.entity';
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
  QueryResult<RuleExecutionDTO[]>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    query: GetExecutionsByExpenseQuery
  ): Promise<QueryResult<RuleExecutionDTO[]>> {
    const executions = await this.executionService.getExecutionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    );

    return QueryResult.success(executions.items.map(RuleExecution.toDTO));
  }
}
