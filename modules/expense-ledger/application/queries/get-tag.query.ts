import { TagNotFoundError } from "../../domain/errors/expense.errors";

import { TagService } from "../services/tag.service";

export class GetTagQuery {
  constructor(
    public readonly tagId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetTagHandler {
  constructor(private readonly tagService: TagService) {}

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
