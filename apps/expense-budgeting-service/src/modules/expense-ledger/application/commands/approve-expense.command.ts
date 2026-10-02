import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface ApproveExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly approverId: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class ApproveExpenseHandler implements ICommandHandler<
  ApproveExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for ApproveExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for ApproveExpenseHandler');
    }
  }

  async handle(command: ApproveExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    await this.operationService.authorize({
      actorId: command.approverId,
      workspaceId: command.workspaceId,
      requiredRole: 'ADMIN',
      authToken: command.authToken,
      verifiedMembership: command.verifiedMembership,
    });

    const dto = await this.expenseService.approveExpense(
      command.expenseId,
      command.workspaceId,
      command.approverId
    );
    return CommandResult.success(dto);
  }
}
