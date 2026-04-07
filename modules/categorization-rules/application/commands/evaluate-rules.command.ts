import { RuleExecutionService } from '../services/rule-execution.service';
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

export interface EvaluationResultDTO {
  appliedRule: {
    id: string;
    name: string;
    priority: number;
  } | null;
  suggestedCategoryId: string | null;
  execution: {
    id: string;
    ruleId: string;
    expenseId: string;
    appliedCategoryId: string;
    executedAt: Date;
  } | null;
}

export class EvaluateRulesHandler implements ICommandHandler<
  EvaluateRulesCommand,
  CommandResult<EvaluationResultDTO>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    command: EvaluateRulesCommand
  ): Promise<CommandResult<EvaluationResultDTO>> {
    const result = await this.executionService.evaluateAndApplyRules({
      workspaceId: WorkspaceId.fromString(command.workspaceId),
      expenseId: ExpenseId.fromString(command.expenseId),
      expenseData: command.expenseData,
    });

    const evaluationResult: EvaluationResultDTO = {
      appliedRule: result.appliedRule
        ? {
            id: result.appliedRule.id,
            name: result.appliedRule.name,
            priority: result.appliedRule.priority,
          }
        : null,
      suggestedCategoryId: result.suggestedCategoryId,
      execution: result.execution
        ? {
            id: result.execution.id,
            ruleId: result.execution.ruleId,
            expenseId: result.execution.expenseId,
            appliedCategoryId: result.execution.appliedCategoryId,
            executedAt: result.execution.executedAt,
          }
        : null,
    };

    return CommandResult.success(evaluationResult);
  }
}
