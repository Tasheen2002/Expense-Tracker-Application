import { CategoryRuleService } from '../services/category-rule.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeactivateCategoryRuleCommand extends ICommand {
  ruleId: string;
  userId: string;
}

export class DeactivateCategoryRuleHandler implements ICommandHandler<
  DeactivateCategoryRuleCommand,
  CommandResult<void>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    command: DeactivateCategoryRuleCommand
  ): Promise<CommandResult<void>> {
    await this.ruleService.deactivateRule(
      RuleId.fromString(command.ruleId),
      command.userId
    );

    return CommandResult.success();
  }
}
