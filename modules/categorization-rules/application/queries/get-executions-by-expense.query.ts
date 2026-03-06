import { RuleExecutionService } from '../services/rule-execution.service'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'

export interface GetExecutionsByExpenseQuery {
  expenseId: string
  workspaceId: string
}

export class GetExecutionsByExpenseHandler {
  constructor(private readonly executionService: RuleExecutionService) {}

  async execute(query: GetExecutionsByExpenseQuery) {
    const executions = await this.executionService.getExecutionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    )

    return executions.items.map((execution) => ({
      id: execution.getId().getValue(),
      ruleId: execution.getRuleId().getValue(),
      expenseId: execution.getExpenseId().getValue(),
      workspaceId: execution.getWorkspaceId().getValue(),
      appliedCategoryId: execution.getAppliedCategoryId().getValue(),
      executedAt: execution.getExecutedAt(),
    }))
  }
}
