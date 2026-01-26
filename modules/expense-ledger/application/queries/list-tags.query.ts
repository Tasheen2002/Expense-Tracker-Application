export class ListTagsQuery {
  constructor(public readonly workspaceId: string) {}
}

export class ListTagsHandler {
  constructor(private readonly tagService: any) {}

  async handle(query: ListTagsQuery) {
    return await this.tagService.getTagsByWorkspace(query.workspaceId)
  }
}
