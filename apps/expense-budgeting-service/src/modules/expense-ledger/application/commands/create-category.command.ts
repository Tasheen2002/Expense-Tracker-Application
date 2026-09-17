import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { CategoryService } from '../services/category.service';
import { CategoryDTO } from '../../domain/entities/category.entity';

export interface CreateCategoryCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly description?: string;
  readonly color?: string;
  readonly icon?: string;
}

export class CreateCategoryHandler implements ICommandHandler<
  CreateCategoryCommand,
  CommandResult<CategoryDTO>
> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(
    command: CreateCategoryCommand
  ): Promise<CommandResult<CategoryDTO>> {
    const dto = await this.categoryService.createCategory({
      workspaceId: command.workspaceId,
      name: command.name,
      description: command.description,
      color: command.color,
      icon: command.icon,
    });
    return CommandResult.success(dto);
  }
}
