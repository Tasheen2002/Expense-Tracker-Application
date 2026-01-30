import { TagNotFoundError } from "../../domain/errors/expense.errors";

export class GetTagQuery {
  constructor(
    public readonly tagId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetTagHandler {
  constructor(private readonly tagService: any) {}

  async handle(query: GetTagQuery) {
    const tag = await this.tagService.getTagById(
      query.tagId,
      query.workspaceId,
    );

    if (!tag) {
      throw new TagNotFoundError(query.tagId, query.workspaceId);
    }

    return tag;
  }
}
