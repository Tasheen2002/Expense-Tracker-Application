export class DeleteCategoryCommand {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string
  ) {}
}

export class DeleteCategoryHandler {
  constructor(private readonly categoryService: any) {}

  async handle(command: DeleteCategoryCommand): Promise<void> {
    await this.categoryService.deleteCategory(command.categoryId, command.workspaceId)
  }
}
