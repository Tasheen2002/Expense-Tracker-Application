import { CategoryRuleService } from "../services/category-rule.service";
import { RuleId } from "../../domain/value-objects/rule-id";

export interface GetRuleByIdQuery {
  ruleId: string;
  userId: string;
}

export class GetRuleByIdHandler {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async execute(query: GetRuleByIdQuery) {
    const rule = await this.ruleService.getRuleById(
      RuleId.fromString(query.ruleId),
      query.userId,
    );

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
    };
  }
}
