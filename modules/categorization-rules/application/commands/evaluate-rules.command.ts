import { RuleExecutionService, EvaluationResult } from '../services/rule-execution.service';
import { WorkspaceId } from '../../../identity-workspace';
import { ExpenseId } from '../../../expense-ledger';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface EvaluateRulesCommand extends ICommand {
  workspaceId: string;
  expenseId: string;
  expenseData: {
    merchant?: string;
    description?: string;
    amount: number;
    paymentMethod?: string;
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
