import { CategoryRuleService } from '../services/category-rule.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'

export interface GetRulesByWorkspaceQuery {
  workspaceId: string
}

export class GetRulesByWorkspaceHandler {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async execute(query: GetRulesByWorkspaceQuery) {
    const rules = await this.ruleService.getRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId)
    )

    return rules.map((rule) => ({
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
    }))
  }
}
