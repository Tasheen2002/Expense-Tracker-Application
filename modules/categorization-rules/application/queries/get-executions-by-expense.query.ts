import { RuleExecutionService } from '../services/rule-execution.service'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { RuleExecution } from '../../domain/entities/rule-execution.entity'
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface GetExecutionsByExpenseQuery extends IQuery {
  readonly expenseId: string
  readonly workspaceId: string
}

export class GetExecutionsByExpenseHandler implements IQueryHandler<GetExecutionsByExpenseQuery, PaginatedResult<RuleExecution>> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(query: GetExecutionsByExpenseQuery): Promise<PaginatedResult<RuleExecution>> {
    return await this.executionService.getExecutionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    )
  }
}

