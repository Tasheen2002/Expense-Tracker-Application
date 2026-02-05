import { CategoryRuleService } from '../services/category-rule.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo'
import { RuleCondition } from '../../domain/value-objects/rule-condition'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { RuleConditionType, isValidRuleConditionType } from '../../domain/enums/rule-condition-type'
import { InvalidRuleConditionError } from '../../domain/errors/categorization-rules.errors'

export interface CreateCategoryRuleCommand {
  workspaceId: string
  name: string
  description?: string
  priority?: number
  conditionType: string
  conditionValue: string
  targetCategoryId: string
  createdBy: string
}

export class CreateCategoryRuleHandler {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async execute(command: CreateCategoryRuleCommand) {
    if (!isValidRuleConditionType(command.conditionType)) {
      throw new InvalidRuleConditionError(`Invalid condition type: ${command.conditionType}`)
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

    return {
      id: rule.getId().getValue(),
      workspaceId: rule.getWorkspaceId().getValue(),
      name: rule.getName(),
      description: rule.getDescription(),
      priority: rule.getPriority(),
      isActive: rule.getIsActive(),
      condition: {
        type: rule.getCondition().getType(),
        value: rule.getCondition().getValue(),
      },
      targetCategoryId: rule.getTargetCategoryId().getValue(),
      createdBy: rule.getCreatedBy().getValue(),
      createdAt: rule.getCreatedAt(),
      updatedAt: rule.getUpdatedAt(),
    }
  }
}
