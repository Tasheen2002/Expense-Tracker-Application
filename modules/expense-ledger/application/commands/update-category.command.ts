import { CategoryService } from "../services/category.service";

export class UpdateCategoryCommand {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly color?: string,
    public readonly icon?: string,
  ) {}
}

export class UpdateCategoryHandler {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(command: UpdateCategoryCommand) {
    return await this.categoryService.updateCategory(
      command.categoryId,
      command.workspaceId,
      {
        name: command.name,
        description: command.description,
        color: command.color,
        icon: command.icon,
      },
    );
  }
}
