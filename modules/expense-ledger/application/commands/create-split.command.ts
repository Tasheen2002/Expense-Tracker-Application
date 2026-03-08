import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseSplitService } from '../services/expense-split.service';
import { ExpenseService } from '../services/expense.service';
import { SplitType } from '../../domain/enums/split-type';
import { ExpenseSplit } from '../../domain/entities/expense-split.entity';
import {
  ExpenseNotFoundError,
  UnauthorizedExpenseAccessError,
} from '../../domain/errors/expense.errors';

export interface CreateSplitCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly splitType: SplitType;
  readonly participants: Array<{
    userId: string;
    shareAmount?: number;
    sharePercentage?: number;
  }>;
}

export class CreateSplitHandler implements ICommandHandler<
  CreateSplitCommand,
  CommandResult<ExpenseSplit>
> {
  constructor(
    private readonly splitService: ExpenseSplitService,
    private readonly expenseService: ExpenseService
  ) {}

  async handle(
    command: CreateSplitCommand
  ): Promise<CommandResult<ExpenseSplit>> {
    try {
      const expense = await this.expenseService.getExpenseById(
        command.expenseId,
        command.workspaceId
      );

      if (!expense) {
        throw new ExpenseNotFoundError(command.expenseId, command.workspaceId);
      }

      if (expense.userId !== command.userId) {
        throw new UnauthorizedExpenseAccessError(
          command.expenseId,
          command.userId,
          'split'
        );
      }

      const split = await this.splitService.createSplit({
        expenseId: command.expenseId,
        workspaceId: command.workspaceId,
        userId: command.userId,
        totalAmount: expense.amount,
        splitType: command.splitType,
        participants: command.participants,
      });
      return CommandResult.success(split);
    } catch (error) {
      return CommandResult.failure<ExpenseSplit>(
        error instanceof Error ? error.message : 'Failed to create split'
      );
    }
  }
}
