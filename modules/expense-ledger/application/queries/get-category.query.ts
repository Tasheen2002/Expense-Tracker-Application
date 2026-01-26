export class GetCategoryQuery {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string
  ) {}
}

export class GetCategoryHandler {
  constructor(private readonly categoryService: any) {}

  async handle(query: GetCategoryQuery) {
    const category = await this.categoryService.getCategoryById(
      query.categoryId,
      query.workspaceId
    )

    if (!category) {
      throw new Error('Category not found')
    }

    return category
  }
}
