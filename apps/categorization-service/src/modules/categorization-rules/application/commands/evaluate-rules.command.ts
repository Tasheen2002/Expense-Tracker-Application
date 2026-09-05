import { RuleExecutionService, EvaluationResult } from '../services/rule-execution.service';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId  } from '@core/domain/value-objects';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface EvaluateRulesCommand extends ICommand {
  readonly workspaceId: string;
  readonly expenseId: string;
  readonly expenseData: {
    readonly merchant?: string;
    readonly description?: string;
    readonly amount: number;
    readonly paymentMethod?: string;
  };
}

export class EvaluateRulesHandler implements ICommandHandler<
  EvaluateRulesCommand,
  CommandResult<EvaluationResult>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    command: EvaluateRulesCommand
  ): Promise<CommandResult<EvaluationResult>> {
    const result = await this.executionService.evaluateAndApplyRules({
      workspaceId: WorkspaceId.fromString(command.workspaceId),
      expenseId: ExpenseId.fromString(command.expenseId),
      expenseData: command.expenseData,
    });

    return CommandResult.success(result);
  }
}
