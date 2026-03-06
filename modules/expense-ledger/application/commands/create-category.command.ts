import { CategoryService } from "../services/category.service";

export class CreateCategoryCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly description?: string,
    public readonly color?: string,
    public readonly icon?: string,
  ) {}
}

export class CreateCategoryHandler {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(command: CreateCategoryCommand) {
    return await this.categoryService.createCategory({
      workspaceId: command.workspaceId,
      name: command.name,
      description: command.description,
      color: command.color,
      icon: command.icon,
    });
  }
}
