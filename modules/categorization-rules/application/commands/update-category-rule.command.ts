import { CategoryRuleService } from '../services/category-rule.service';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import { RuleId } from '../../domain/value-objects/rule-id';
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
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    command: UpdateCategoryRuleCommand
  ): Promise<CommandResult<CategoryRuleDTO>> {
    let condition: RuleCondition | undefined;
    if (command.conditionType && command.conditionValue) {
      if (!isValidRuleConditionType(command.conditionType)) {
        throw new InvalidRuleConditionError(
          `Invalid condition type: ${command.conditionType}`
        );
      }
      condition = RuleCondition.create(
        command.conditionType as RuleConditionType,
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
      targetCategoryId: command.targetCategoryId
        ? CategoryId.fromString(command.targetCategoryId)
        : undefined,
    });

    return CommandResult.success(rule);
  }
}
