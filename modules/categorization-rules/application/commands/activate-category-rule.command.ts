import { CategoryRuleService } from "../services/category-rule.service";
import { RuleId } from "../../domain/value-objects/rule-id";
import { CategorizationRuleDomainError } from "../../domain/errors/categorization-rules.errors";
import { CategoryRule } from "../../domain/entities/category-rule.entity";
import { ICommand, ICommandHandler, CommandResult } from "../../../../packages/core/src/application/cqrs";

export interface ActivateCategoryRuleCommand extends ICommand {
  readonly ruleId: string;
  readonly userId: string;
}

export class ActivateCategoryRuleHandler implements ICommandHandler<ActivateCategoryRuleCommand, CommandResult<CategoryRule>> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(command: ActivateCategoryRuleCommand): Promise<CommandResult<CategoryRule>> {
    try {
      const rule = await this.ruleService.activateRule(
        RuleId.fromString(command.ruleId),
        command.userId,
      );
      return CommandResult.success<CategoryRule>(rule);
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error;
      }
      if (error instanceof Error) {
        return CommandResult.failure<CategoryRule>(error.message);
      }
      return CommandResult.failure<CategoryRule>('An unexpected error occurred during category rule activation');
    }
  }
}

