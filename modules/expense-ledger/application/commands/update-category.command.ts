import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { CategoryService } from '../services/category.service';

export interface UpdateCategoryCommand extends ICommand {
  readonly categoryId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string;
  readonly color?: string;
  readonly icon?: string;
}

export class UpdateCategoryHandler implements ICommandHandler<
  UpdateCategoryCommand,
  CommandResult<void>
> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(command: UpdateCategoryCommand): Promise<CommandResult<void>> {
    await this.categoryService.updateCategory(
      command.categoryId,
      command.workspaceId,
      {
        name: command.name,
        description: command.description,
        color: command.color,
        icon: command.icon,
      }
    );
    return CommandResult.success();
  }
}
