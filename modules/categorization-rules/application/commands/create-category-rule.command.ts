import { CategoryRuleService } from '../services/category-rule.service';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import { WorkspaceId, UserId } from '../../../identity-workspace';
import { RuleCondition } from '../../domain/value-objects/rule-condition';
import { CategoryId } from '../../../expense-ledger';
import {
  RuleConditionType,
  isValidRuleConditionType,
} from '../../domain/enums/rule-condition-type';
import { InvalidRuleConditionError } from '../../domain/errors/categorization-rules.errors';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateCategoryRuleCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly description?: string;
  readonly priority?: number;
  readonly conditionType: string;
  readonly conditionValue: string;
  readonly targetCategoryId: string;
  readonly createdBy: string;
}

export class CreateCategoryRuleHandler implements ICommandHandler<
  CreateCategoryRuleCommand,
  CommandResult<CategoryRuleDTO>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    command: CreateCategoryRuleCommand
  ): Promise<CommandResult<CategoryRuleDTO>> {
    if (!isValidRuleConditionType(command.conditionType)) {
      throw new InvalidRuleConditionError(
        `Invalid condition type: ${command.conditionType}`
      );
    }

    const rule = await this.ruleService.createRule({
      workspaceId: WorkspaceId.fromString(command.workspaceId),
      name: command.name,
      description: command.description,
      priority: command.priority,
      condition: RuleCondition.create(
        command.conditionType as RuleConditionType,
        command.conditionValue
      ),
      targetCategoryId: CategoryId.fromString(command.targetCategoryId),
      createdBy: UserId.fromString(command.createdBy),
    });

    return CommandResult.success(rule);
  }
}
