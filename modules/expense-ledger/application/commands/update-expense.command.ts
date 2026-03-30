import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { PaymentMethod } from '../../domain/enums/payment-method';
import { ExpenseService } from '../services/expense.service';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryId } from '../../domain/value-objects/category-id';
import { CategoryNotFoundError } from '../../domain/errors/expense.errors';

export interface UpdateExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly title?: string;
  readonly description?: string;
  readonly amount?: number;
  readonly currency?: string;
  readonly expenseDate?: Date | string;
  readonly categoryId?: string;
  readonly merchant?: string;
  readonly paymentMethod?: PaymentMethod;
  readonly isReimbursable?: boolean;
}

export class UpdateExpenseHandler implements ICommandHandler<
  UpdateExpenseCommand,
  CommandResult<void>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly categoryRepository: CategoryRepository
  ) {}

  async handle(command: UpdateExpenseCommand): Promise<CommandResult<void>> {
    if (command.categoryId) {
      const categoryExists = await this.categoryRepository.exists(
        CategoryId.fromString(command.categoryId),
        command.workspaceId
      );
      if (!categoryExists) {
        throw new CategoryNotFoundError(
          command.categoryId,
          command.workspaceId
        );
      }
    }

    const expense = await this.expenseService.updateExpense(
      command.expenseId,
      command.workspaceId,
      command.userId,
      {
        title: command.title,
        description: command.description,
        amount: command.amount,
        currency: command.currency,
        expenseDate: command.expenseDate,
        categoryId: command.categoryId,
        merchant: command.merchant,
        paymentMethod: command.paymentMethod,
        isReimbursable: command.isReimbursable,
      }
    );
    return CommandResult.success();
  }
}
