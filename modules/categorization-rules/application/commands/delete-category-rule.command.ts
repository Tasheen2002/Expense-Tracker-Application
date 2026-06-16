import { CategoryRuleService } from "../services/category-rule.service";
import { RuleId } from "../../domain/value-objects/rule-id";
import { CategorizationRuleDomainError } from "../../domain/errors/categorization-rules.errors";
import { ICommand, ICommandHandler, CommandResult } from "../../../../packages/core/src/application/cqrs";

export interface DeleteCategoryRuleCommand extends ICommand {
  readonly ruleId: string;
  readonly userId: string;
}

export class DeleteCategoryRuleHandler implements ICommandHandler<DeleteCategoryRuleCommand, CommandResult<void>> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(command: DeleteCategoryRuleCommand): Promise<CommandResult<void>> {
    try {
      await this.ruleService.deleteRule(
        RuleId.fromString(command.ruleId),
        command.userId,
      );
      return CommandResult.success<void>(undefined);
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error;
      }
      if (error instanceof Error) {
        return CommandResult.failure<void>(error.message);
      }
      return CommandResult.failure<void>('An unexpected error occurred during category rule deletion');
    }
  }
}

