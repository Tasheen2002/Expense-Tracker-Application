import { CategoryRuleService } from '../services/category-rule.service';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import { RuleId } from '../../domain/value-objects/rule-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface DeactivateCategoryRuleCommand extends ICommand {
  ruleId: string;
  workspaceId: string;
  userId: string;
}

export class DeactivateCategoryRuleHandler implements ICommandHandler<
  DeactivateCategoryRuleCommand,
  CommandResult<CategoryRuleDTO>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    command: DeactivateCategoryRuleCommand
  ): Promise<CommandResult<CategoryRuleDTO>> {
    const rule = await this.ruleService.deactivateRule(
      RuleId.fromString(command.ruleId),
      command.workspaceId,
      command.userId
    );

    return CommandResult.success(rule);
  }
}
