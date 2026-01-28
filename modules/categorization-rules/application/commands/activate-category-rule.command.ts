import { CategoryRuleService } from '../services/category-rule.service'
import { RuleId } from '../../domain/value-objects/rule-id'

export interface ActivateCategoryRuleCommand {
  ruleId: string
}

export class ActivateCategoryRuleHandler {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async execute(command: ActivateCategoryRuleCommand) {
    const rule = await this.ruleService.activateRule(RuleId.fromString(command.ruleId))

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
