import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface ReimburseExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly processedBy: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class ReimburseExpenseHandler implements ICommandHandler<
  ReimburseExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for ReimburseExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for ReimburseExpenseHandler');
    }
  }

  async handle(command: ReimburseExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    await this.operationService.authorize({
      actorId: command.processedBy,
      workspaceId: command.workspaceId,
      requiredRole: 'ADMIN',
      authToken: command.authToken,
      verifiedMembership: command.verifiedMembership,
    });

    const dto = await this.expenseService.markExpenseAsReimbursed(
      command.expenseId,
      command.workspaceId,
      command.processedBy
    );
    return CommandResult.success(dto);
  }
}
