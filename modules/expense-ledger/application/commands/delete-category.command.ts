import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { CategoryService } from "../services/category.service";

export interface DeleteCategoryCommand extends ICommand {
  readonly categoryId: string;
  readonly workspaceId: string;
}

export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand, CommandResult<void>> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(command: DeleteCategoryCommand): Promise<CommandResult<void>> {
    try {
      await this.categoryService.deleteCategory(
        command.categoryId,
        command.workspaceId,
      );
      return CommandResult.success();
    } catch (error) {
      return CommandResult.failure(
        error instanceof Error ? error.message : "Failed to delete category",
      );
    }
  }
}
