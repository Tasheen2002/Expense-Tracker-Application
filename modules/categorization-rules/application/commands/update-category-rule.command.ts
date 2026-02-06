import { CategoryRuleService } from "../services/category-rule.service";
import { RuleId } from "../../domain/value-objects/rule-id";
import { RuleCondition } from "../../domain/value-objects/rule-condition";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { RuleConditionType, isValidRuleConditionType } from "../../domain/enums/rule-condition-type";
import { InvalidRuleConditionError } from "../../domain/errors/categorization-rules.errors";

export interface UpdateCategoryRuleCommand {
  ruleId: string;
  userId: string;
  name?: string;
  description?: string | null;
  priority?: number;
  conditionType?: string;
  conditionValue?: string;
  targetCategoryId?: string;
}

export class UpdateCategoryRuleHandler {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async execute(command: UpdateCategoryRuleCommand) {
    let condition: RuleCondition | undefined;
    if (command.conditionType && command.conditionValue) {
      if (!isValidRuleConditionType(command.conditionType)) {
        throw new InvalidRuleConditionError(`Invalid condition type: ${command.conditionType}`);
      }
      condition = RuleCondition.create(
        command.conditionType as RuleConditionType,
        command.conditionValue,
      );
    }

    const rule = await this.ruleService.updateRule({
      ruleId: RuleId.fromString(command.ruleId),
      userId: command.userId,
      name: command.name,
      description: command.description,
      priority: command.priority,
      condition,
      targetCategoryId: command.targetCategoryId
        ? CategoryId.fromString(command.targetCategoryId)
        : undefined,
    });

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
