import { CategoryRuleService } from "../services/category-rule.service";
import { RuleId } from "../../domain/value-objects/rule-id";

export interface DeleteCategoryRuleCommand {
  ruleId: string;
  userId: string;
}

export class DeleteCategoryRuleHandler {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async execute(command: DeleteCategoryRuleCommand): Promise<void> {
    await this.ruleService.deleteRule(
      RuleId.fromString(command.ruleId),
      command.userId,
    );
  }
}
