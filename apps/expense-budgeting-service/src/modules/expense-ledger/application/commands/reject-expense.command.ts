import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface RejectExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly rejecterId: string;
  readonly reason?: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class RejectExpenseHandler implements ICommandHandler<
  RejectExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for RejectExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for RejectExpenseHandler');
    }
  }

  async handle(command: RejectExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    await this.operationService.authorize({
      actorId: command.rejecterId,
      workspaceId: command.workspaceId,
      requiredRole: 'ADMIN',
      authToken: command.authToken,
      verifiedMembership: command.verifiedMembership,
    });

    const dto = await this.expenseService.rejectExpense(
      command.expenseId,
      command.workspaceId,
      command.rejecterId,
      command.reason
    );
    return CommandResult.success(dto);
  }
}
