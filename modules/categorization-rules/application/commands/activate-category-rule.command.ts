import { CategoryRuleService } from '../services/category-rule.service';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import { RuleId } from '../../domain/value-objects/rule-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ActivateCategoryRuleCommand extends ICommand {
  readonly ruleId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class ActivateCategoryRuleHandler implements ICommandHandler<
  ActivateCategoryRuleCommand,
  CommandResult<CategoryRuleDTO>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    command: ActivateCategoryRuleCommand
  ): Promise<CommandResult<CategoryRuleDTO>> {
    const rule = await this.ruleService.activateRule(
      RuleId.fromString(command.ruleId),
      command.workspaceId,
      command.userId
    );

    return CommandResult.success(rule);
  }
}
