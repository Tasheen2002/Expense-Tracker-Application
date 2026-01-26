export class ListCategoriesQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly activeOnly: boolean = false
  ) {}
}

export class ListCategoriesHandler {
  constructor(private readonly categoryService: any) {}

  async handle(query: ListCategoriesQuery) {
    if (query.activeOnly) {
      return await this.categoryService.getActiveCategoriesByWorkspace(query.workspaceId)
    }
    return await this.categoryService.getCategoriesByWorkspace(query.workspaceId)
  }
}
