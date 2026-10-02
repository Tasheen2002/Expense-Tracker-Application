import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface SubmitExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class SubmitExpenseHandler implements ICommandHandler<
  SubmitExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for SubmitExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for SubmitExpenseHandler');
    }
  }

  async handle(command: SubmitExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    await this.operationService.authorize({
      actorId: command.userId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
      verifiedMembership: command.verifiedMembership,
    });

    const dto = await this.expenseService.submitExpense(
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(dto);
  }
}
