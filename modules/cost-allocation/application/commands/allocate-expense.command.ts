import { ExpenseAllocationService } from '../services/expense-allocation.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface AllocateExpenseCommand extends ICommand {
  workspaceId: string;
  expenseId: string;
  createdBy: string;
  allocations: Array<{
    amount: number;
    percentage?: number;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
    notes?: string;
  }>;
}

export class AllocateExpenseHandler implements ICommandHandler<
  AllocateExpenseCommand,
  CommandResult<void>
> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(command: AllocateExpenseCommand): Promise<CommandResult<void>> {
    await this.expenseAllocationService.allocateExpense({
      workspaceId: command.workspaceId,
      expenseId: command.expenseId,
      createdBy: command.createdBy,
      allocations: command.allocations,
    });
    return CommandResult.success(undefined);
  }
}
