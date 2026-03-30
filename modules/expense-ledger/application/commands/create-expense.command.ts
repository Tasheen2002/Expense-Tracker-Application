import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { PaymentMethod } from '../../domain/enums/payment-method';
import { ExpenseService } from '../services/expense.service';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { TagRepository } from '../../domain/repositories/tag.repository';
import { CategoryId } from '../../domain/value-objects/category-id';
import { TagId } from '../../domain/value-objects/tag-id';
import { Expense } from '../../domain/entities/expense.entity';
import {
  CategoryNotFoundError,
  TagNotFoundError,
} from '../../domain/errors/expense.errors';

export interface CreateExpenseCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly title: string;
  readonly amount: number;
  readonly currency: string;
  readonly expenseDate: Date | string;
  readonly paymentMethod: PaymentMethod;
  readonly isReimbursable: boolean;
  readonly description?: string;
  readonly categoryId?: string;
  readonly merchant?: string;
  readonly tagIds?: string[];
}

export class CreateExpenseHandler implements ICommandHandler<
  CreateExpenseCommand,
  CommandResult<{ expenseId: string }>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly categoryRepository: CategoryRepository,
    private readonly tagRepository: TagRepository
  ) {}

  async handle(
    command: CreateExpenseCommand
  ): Promise<CommandResult<{ expenseId: string }>> {
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

    if (command.tagIds && command.tagIds.length > 0) {
      const uniqueTagIds = Array.from(new Set(command.tagIds));
      const tagIdObjects = uniqueTagIds.map((id) => TagId.fromString(id));
      const foundTags = await this.tagRepository.findByIds(
        tagIdObjects,
        command.workspaceId
      );
      if (foundTags.length !== uniqueTagIds.length) {
        throw new TagNotFoundError('one_or_more', command.workspaceId);
      }
    }

    const expense = await this.expenseService.createExpense({
      workspaceId: command.workspaceId,
      userId: command.userId,
      title: command.title,
      description: command.description,
      amount: command.amount,
      currency: command.currency,
      expenseDate: command.expenseDate,
      categoryId: command.categoryId,
      merchant: command.merchant,
      paymentMethod: command.paymentMethod,
      isReimbursable: command.isReimbursable,
      tagIds: command.tagIds,
    });
    return CommandResult.success({ expenseId: expense.id.getValue() });
  }
}
