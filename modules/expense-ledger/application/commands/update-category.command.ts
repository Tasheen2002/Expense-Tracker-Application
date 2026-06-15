import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { CategoryService } from '../services/category.service';
import { CategoryDTO } from '../../domain/entities/category.entity';

export interface UpdateCategoryCommand extends ICommand {
  readonly categoryId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string;
  readonly color?: string;
  readonly icon?: string;
  readonly isActive?: boolean;
}

export class UpdateCategoryHandler implements ICommandHandler<
  UpdateCategoryCommand,
  CommandResult<CategoryDTO>
> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(command: UpdateCategoryCommand): Promise<CommandResult<CategoryDTO>> {
    const category = await this.categoryService.updateCategory(
      command.categoryId,
      command.workspaceId,
      {
        name: command.name,
        description: command.description,
        color: command.color,
        icon: command.icon,
        isActive: command.isActive,
      }
    );
    return CommandResult.success(category);
  }
}
