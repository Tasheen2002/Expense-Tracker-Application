import { CategoryRuleService } from '../services/category-rule.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeleteCategoryRuleCommand extends ICommand {
  ruleId: string;
  userId: string;
}

export class DeleteCategoryRuleHandler implements ICommandHandler<
  DeleteCategoryRuleCommand,
  CommandResult<void>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    command: DeleteCategoryRuleCommand
  ): Promise<CommandResult<void>> {
    await this.ruleService.deleteRule(
      RuleId.fromString(command.ruleId),
      command.userId
    );

    return CommandResult.success();
  }
}
