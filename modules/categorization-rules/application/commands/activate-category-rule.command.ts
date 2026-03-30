import { CategoryRuleService } from '../services/category-rule.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface ActivateCategoryRuleCommand extends ICommand {
  ruleId: string;
  userId: string;
}

export class ActivateCategoryRuleHandler implements ICommandHandler<
  ActivateCategoryRuleCommand,
  CommandResult<void>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    command: ActivateCategoryRuleCommand
  ): Promise<CommandResult<void>> {
    await this.ruleService.activateRule(
      RuleId.fromString(command.ruleId),
      command.userId
    );

    return CommandResult.success();
  }
}
