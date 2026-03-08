import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { CategoryService } from '../services/category.service';
import { ExpenseRepository } from '../../domain/repositories/expense.repository';
import { CategoryId } from '../../domain/value-objects/category-id';
import { CategoryInUseError } from '../../domain/errors/expense.errors';

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
    try {
      const expenseCount = await this.expenseRepository.getCountByCategory(
        CategoryId.fromString(command.categoryId),
        command.workspaceId
      );
      if (expenseCount > 0) {
        throw new CategoryInUseError(command.categoryId, expenseCount);
      }
      await this.categoryService.deleteCategory(
        command.categoryId,
        command.workspaceId
      );
      return CommandResult.success();
    } catch (error) {
      return CommandResult.failure(
        error instanceof Error ? error.message : 'Failed to delete category'
      );
    }
  }
}
