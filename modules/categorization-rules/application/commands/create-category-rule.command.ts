import { CategoryRuleService } from '../services/category-rule.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo'
import { RuleCondition } from '../../domain/value-objects/rule-condition'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { RuleConditionType, isValidRuleConditionType } from '../../domain/enums/rule-condition-type'
import { CategorizationRuleDomainError } from '../../domain/errors/categorization-rules.errors'
import { CategoryRule } from '../../domain/entities/category-rule.entity'

import { ICommand, ICommandHandler, CommandResult } from '../../../../packages/core/src/application/cqrs'


export interface CreateCategoryRuleCommand extends ICommand {
  readonly workspaceId: string
  readonly name: string
  readonly description?: string
  readonly priority?: number
  readonly conditionType: string
  readonly conditionValue: string
  readonly targetCategoryId: string
  readonly createdBy: string
}

export class CreateCategoryRuleHandler implements ICommandHandler<CreateCategoryRuleCommand, CommandResult<CategoryRule>> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(command: CreateCategoryRuleCommand): Promise<CommandResult<CategoryRule>> {
    try {
      if (!isValidRuleConditionType(command.conditionType)) {
        return CommandResult.failure<CategoryRule>(`Invalid condition type: ${command.conditionType}`)
      }

      const rule = await this.ruleService.createRule({
        workspaceId: WorkspaceId.fromString(command.workspaceId),
        name: command.name,
        description: command.description,
        priority: command.priority,
        condition: RuleCondition.create(
          command.conditionType as RuleConditionType,
          command.conditionValue
        ),
        targetCategoryId: CategoryId.fromString(command.targetCategoryId),
        createdBy: UserId.fromString(command.createdBy),
      })

      return CommandResult.success<CategoryRule>(rule)
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error
      }
      if (error instanceof Error) {
        return CommandResult.failure<CategoryRule>(error.message)
      }
      return CommandResult.failure<CategoryRule>('An unexpected error occurred during category rule creation')
    }
  }
}

