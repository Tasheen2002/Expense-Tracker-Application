import { ExpenseAllocationService } from '../services/expense-allocation.service';
import { ExpenseAllocationDTO } from '../../domain/entities/expense-allocation.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface AllocateExpenseCommand extends ICommand {
  readonly workspaceId: string;
  readonly expenseId: string;
  readonly createdBy: string;
  readonly allocations: Array<{
    readonly amount: number;
    readonly percentage?: number;
    readonly departmentId?: string;
    readonly costCenterId?: string;
    readonly projectId?: string;
    readonly notes?: string;
  }>;
}

export class AllocateExpenseHandler implements ICommandHandler<
  AllocateExpenseCommand,
  CommandResult<ExpenseAllocationDTO[]>
> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(command: AllocateExpenseCommand): Promise<CommandResult<ExpenseAllocationDTO[]>> {
    const allocations = await this.expenseAllocationService.allocateExpense({
      workspaceId: command.workspaceId,
      expenseId: command.expenseId,
      createdBy: command.createdBy,
      allocations: command.allocations,
    });
    return CommandResult.success(allocations);
  }
}
