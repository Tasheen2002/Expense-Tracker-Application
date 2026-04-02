import { RuleExecutionService } from '../services/rule-execution.service';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id';
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

interface EvaluationResult {
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

    const evaluationResult: EvaluationResult = {
      appliedRule: result.appliedRule
        ? {
            id: result.appliedRule.getId().getValue(),
            name: result.appliedRule.getName(),
            priority: result.appliedRule.getPriority(),
          }
        : null,
      suggestedCategoryId: result.suggestedCategoryId?.getValue() || null,
      execution: result.execution
        ? {
            id: result.execution.getId().getValue(),
            ruleId: result.execution.getRuleId().getValue(),
            expenseId: result.execution.getExpenseId().getValue(),
            appliedCategoryId: result.execution
              .getAppliedCategoryId()
              .getValue(),
            executedAt: result.execution.getExecutedAt(),
          }
        : null,
    };

    return CommandResult.success(evaluationResult);
  }
}
