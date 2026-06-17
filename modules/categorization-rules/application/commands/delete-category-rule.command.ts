import { CategoryRuleService } from '../services/category-rule.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteCategoryRuleCommand extends ICommand {
  readonly ruleId: string;
  readonly workspaceId: string;
  readonly userId: string;
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
      command.workspaceId,
      command.userId
    );

    return CommandResult.success();
  }
}
