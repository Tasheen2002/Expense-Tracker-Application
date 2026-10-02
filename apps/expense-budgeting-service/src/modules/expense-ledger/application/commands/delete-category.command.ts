import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { CategoryService } from '../services/category.service';
import { IExpenseRepository } from '../../domain/repositories/expense.repository';

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
    _expenseRepository?: IExpenseRepository
  ) {}

  async handle(command: DeleteCategoryCommand): Promise<CommandResult<void>> {
    // Database foreign key constraint uses ON DELETE SET NULL for expenses referencing this category
    await this.categoryService.deleteCategory(
      command.categoryId,
      command.workspaceId
    );
    return CommandResult.success();
  }
}
