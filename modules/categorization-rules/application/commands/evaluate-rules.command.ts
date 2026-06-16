import { RuleExecutionService } from '../services/rule-execution.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryRule } from '../../domain/entities/category-rule.entity'
import { RuleExecution } from '../../domain/entities/rule-execution.entity'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { CategorizationRuleDomainError } from '../../domain/errors/categorization-rules.errors'
import { ICommand, ICommandHandler, CommandResult } from '../../../../packages/core/src/application/cqrs'

export interface EvaluateRulesCommand extends ICommand {
  readonly workspaceId: string
  readonly expenseId: string
  readonly expenseData: {
    readonly merchant?: string
    readonly description?: string
    readonly amount: number
    readonly paymentMethod?: string
  }
}

export interface EvaluateRulesResult {
  readonly appliedRule: CategoryRule | null
  readonly suggestedCategoryId: CategoryId | null
  readonly execution: RuleExecution | null
}

export class EvaluateRulesHandler implements ICommandHandler<EvaluateRulesCommand, CommandResult<EvaluateRulesResult>> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(command: EvaluateRulesCommand): Promise<CommandResult<EvaluateRulesResult>> {
    try {
      const result = await this.executionService.evaluateAndApplyRules({
        workspaceId: WorkspaceId.fromString(command.workspaceId),
        expenseId: ExpenseId.fromString(command.expenseId),
        expenseData: command.expenseData,
      })

      return CommandResult.success<EvaluateRulesResult>({
        appliedRule: result.appliedRule,
        suggestedCategoryId: result.suggestedCategoryId,
        execution: result.execution,
      })
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error
      }
      if (error instanceof Error) {
        return CommandResult.failure<EvaluateRulesResult>(error.message)
      }
      return CommandResult.failure<EvaluateRulesResult>('An unexpected error occurred during rule evaluation')
    }
  }
}

