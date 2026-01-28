import { RuleExecutionService } from '../services/rule-execution.service'
import { RuleId } from '../../domain/value-objects/rule-id'

export interface GetExecutionsByRuleQuery {
  ruleId: string
}

export class GetExecutionsByRuleHandler {
  constructor(private readonly executionService: RuleExecutionService) {}

  async execute(query: GetExecutionsByRuleQuery) {
    const executions = await this.executionService.getExecutionsByRuleId(
      RuleId.fromString(query.ruleId)
    )

    return executions.map((execution) => ({
      id: execution.getId().getValue(),
      ruleId: execution.getRuleId().getValue(),
      expenseId: execution.getExpenseId().getValue(),
      workspaceId: execution.getWorkspaceId().getValue(),
      appliedCategoryId: execution.getAppliedCategoryId().getValue(),
      executedAt: execution.getExecutedAt(),
    }))
  }
}
