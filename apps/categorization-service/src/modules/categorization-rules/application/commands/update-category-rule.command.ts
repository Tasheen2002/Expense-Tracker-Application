import { CategoryRuleService } from '../services/category-rule.service';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import { RuleId } from '../../domain/value-objects/rule-id';
import { RuleCondition } from '../../domain/value-objects/rule-condition';
import {  CategoryId  } from '@core/domain/value-objects';
import {
  isValidRuleConditionType,
} from '../../domain/enums/rule-condition-type';
import { InvalidRuleConditionError } from '../../domain/errors/categorization-rules.errors';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateCategoryRuleCommand extends ICommand {
  readonly ruleId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly priority?: number;
  readonly conditionType?: string;
  readonly conditionValue?: string;
  readonly targetCategoryId?: string;
}

export class UpdateCategoryRuleHandler implements ICommandHandler<
  UpdateCategoryRuleCommand,
  CommandResult<CategoryRuleDTO>
> {
  constructor(private readonly ruleService: Pick<CategoryRuleService, 'updateRule'>) {}

  async handle(
    command: UpdateCategoryRuleCommand
  ): Promise<CommandResult<CategoryRuleDTO>> {
    let condition: RuleCondition | undefined;
    const hasType = command.conditionType !== undefined;
    const hasValue = command.conditionValue !== undefined;
    if (hasType !== hasValue) {
      throw new InvalidRuleConditionError('Condition type and value must be provided together');
    }
    if (command.conditionType !== undefined && command.conditionValue !== undefined) {
      if (!isValidRuleConditionType(command.conditionType)) {
        throw new InvalidRuleConditionError(
          `Invalid condition type: ${command.conditionType}`
        );
      }
      condition = RuleCondition.create(
        command.conditionType,
        command.conditionValue
      );
    }

    const rule = await this.ruleService.updateRule({
      ruleId: RuleId.fromString(command.ruleId),
      workspaceId: command.workspaceId,
      userId: command.userId,
      name: command.name,
      description: command.description,
      priority: command.priority,
      condition,
      targetCategoryId: command.targetCategoryId !== undefined
        ? CategoryId.fromString(command.targetCategoryId)
        : undefined,
    });

    return CommandResult.success(rule);
  }
}
