import { CategoryRuleService } from "../services/category-rule.service";
import { RuleId } from "../../domain/value-objects/rule-id";
import { RuleCondition } from "../../domain/value-objects/rule-condition";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { RuleConditionType, isValidRuleConditionType } from "../../domain/enums/rule-condition-type";
import { CategorizationRuleDomainError } from "../../domain/errors/categorization-rules.errors";
import { CategoryRule } from "../../domain/entities/category-rule.entity";
import { ICommand, ICommandHandler, CommandResult } from "../../../../packages/core/src/application/cqrs";

export interface UpdateCategoryRuleCommand extends ICommand {
  readonly ruleId: string;
  readonly userId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly priority?: number;
  readonly conditionType?: string;
  readonly conditionValue?: string;
  readonly targetCategoryId?: string;
}

export class UpdateCategoryRuleHandler implements ICommandHandler<UpdateCategoryRuleCommand, CommandResult<CategoryRule>> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(command: UpdateCategoryRuleCommand): Promise<CommandResult<CategoryRule>> {
    try {
      let condition: RuleCondition | undefined;
      if (command.conditionType && command.conditionValue) {
        if (!isValidRuleConditionType(command.conditionType)) {
          return CommandResult.failure<CategoryRule>(`Invalid condition type: ${command.conditionType}`);
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

      return CommandResult.success<CategoryRule>(rule);
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error;
      }
      if (error instanceof Error) {
        return CommandResult.failure<CategoryRule>(error.message);
      }
      return CommandResult.failure<CategoryRule>('An unexpected error occurred during category rule update');
    }
  }
}

