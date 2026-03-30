import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { CategoryService } from '../services/category.service';
import { ExpenseRepository } from '../../domain/repositories/expense.repository';
import { CategoryId } from '../../domain/value-objects/category-id';

export interface DeleteCategoryCommand extends ICommand {
  readonly categoryId: string;
  readonly workspaceId: string;
}

export class DeleteCategoryHandler implements ICommandHandler<
  DeleteCategoryCommand,
  CommandResult<void>
> {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly expenseRepository: ExpenseRepository
  ) {}

  async handle(command: DeleteCategoryCommand): Promise<CommandResult<void>> {
    const categoryId = CategoryId.fromString(command.categoryId);

    // Nullify categoryId on all expenses that reference this category
    const expensesResult = await this.expenseRepository.findByCategory(
      categoryId,
      command.workspaceId,
      { limit: 1000, offset: 0 }
    );
    for (const expense of expensesResult.items) {
      expense.updateCategory(undefined);
      await this.expenseRepository.update(expense);
    }

    await this.categoryService.deleteCategory(
      command.categoryId,
      command.workspaceId
    );
    return CommandResult.success();
  }
}
