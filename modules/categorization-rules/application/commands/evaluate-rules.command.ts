import { RuleExecutionService } from '../services/rule-execution.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'

export interface EvaluateRulesCommand {
  workspaceId: string
  expenseId: string
  expenseData: {
    merchant?: string
    description?: string
    amount: number
    paymentMethod?: string
  }
}

export class EvaluateRulesHandler {
  constructor(private readonly executionService: RuleExecutionService) {}

  async execute(command: EvaluateRulesCommand) {
    const result = await this.executionService.evaluateAndApplyRules({
      workspaceId: WorkspaceId.fromString(command.workspaceId),
      expenseId: ExpenseId.fromString(command.expenseId),
      expenseData: command.expenseData,
    })

    return {
      appliedRule: result.appliedRule
        ? {
            id: result.appliedRule.getId().getValue(),
            name: result.appliedRule.getName(),
            priority: result.appliedRule.getPriority(),
          }
        : null,
      suggestedCategoryId: result.suggestedCategoryId?.getValue() || null,
      execution: result.execution
        ? {
            id: result.execution.getId().getValue(),
            ruleId: result.execution.getRuleId().getValue(),
            expenseId: result.execution.getExpenseId().getValue(),
            appliedCategoryId: result.execution.getAppliedCategoryId().getValue(),
            executedAt: result.execution.getExecutedAt(),
          }
        : null,
    }
  }
}
