import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { PaymentMethod } from '../../domain/enums/payment-method';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { ICategoryRepository } from '../../domain/repositories/category.repository';
import { ITagRepository } from '../../domain/repositories/tag.repository';
import { CategoryId } from '../../domain/value-objects/category-id';
import { TagId } from '../../domain/value-objects/tag-id';
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
  CommandResult<ExpenseDTO>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly categoryRepository: ICategoryRepository,
    private readonly tagRepository: ITagRepository
  ) {}

  async handle(
    command: CreateExpenseCommand
  ): Promise<CommandResult<ExpenseDTO>> {
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

    const dto = await this.expenseService.createExpense({
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
    return CommandResult.success(dto);
  }
}
