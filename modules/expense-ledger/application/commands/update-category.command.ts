import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { CategoryService } from "../services/category.service";
import { Category } from "../../domain/entities/category.entity";

export interface UpdateCategoryCommand extends ICommand {
  readonly categoryId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string;
  readonly color?: string;
  readonly icon?: string;
}

export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand, CommandResult<Category>> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(command: UpdateCategoryCommand): Promise<CommandResult<Category>> {
    try {
      const category = await this.categoryService.updateCategory(
        command.categoryId,
        command.workspaceId,
        {
          name: command.name,
          description: command.description,
          color: command.color,
          icon: command.icon,
        },
      );
      return CommandResult.success(category);
    } catch (error) {
      return CommandResult.failure<Category>(
        error instanceof Error ? error.message : "Failed to update category",
      );
    }
  }
}
