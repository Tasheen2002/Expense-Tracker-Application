import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface DeleteExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class DeleteExpenseHandler implements ICommandHandler<
  DeleteExpenseCommand,
  CommandResult<void>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for DeleteExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for DeleteExpenseHandler');
    }
  }

  async handle(command: DeleteExpenseCommand): Promise<CommandResult<void>> {
    await this.operationService.authorize({
      actorId: command.userId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
      verifiedMembership: command.verifiedMembership,
    });

    await this.expenseService.deleteExpense(
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
