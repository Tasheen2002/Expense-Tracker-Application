import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { ICategorizationReferencePort } from '../ports/categorization-reference.port';
import { authorizeWorkspaceWrite } from './authorize-workspace-write';
import { RuleExecutionService, EvaluationResult } from '../services/rule-execution.service';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import {  ExpenseId  } from '@core/domain/value-objects';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface EvaluateRulesCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
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
  constructor(private readonly executionService: Pick<RuleExecutionService, 'evaluateAndApplyRules'>, private readonly workspaceAccess: IWorkspaceAccessPort, private readonly references: ICategorizationReferencePort) {}

  async handle(
    command: EvaluateRulesCommand
  ): Promise<CommandResult<EvaluationResult>> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    await authorizeWorkspaceWrite(command.userId, workspaceId, this.workspaceAccess);
    const expenseId = ExpenseId.fromString(command.expenseId);
    const snapshot = await this.references.readExpense({ workspaceId: workspaceId.getValue(), expenseId: expenseId.getValue(), userId: command.userId });
    const result = await this.executionService.evaluateAndApplyRules({
      workspaceId: workspaceId,
      expenseOwnerId: UserId.fromString(snapshot.expenseOwnerId),
      expenseId,
      expenseData: snapshot.expenseData,
    });

    return CommandResult.success(result);
  }
}
