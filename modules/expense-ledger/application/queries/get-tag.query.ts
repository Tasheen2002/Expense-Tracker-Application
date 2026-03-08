import { IQuery, IQueryHandler, QueryResult } from "../../../../apps/api/src/shared/application";
import { TagService } from "../services/tag.service";
import { Tag } from "../../domain/entities/tag.entity";
import { TagNotFoundError } from "../../domain/errors/expense.errors";

export interface GetTagQuery extends IQuery {
  readonly tagId: string;
  readonly workspaceId: string;
}

export class GetTagHandler implements IQueryHandler<GetTagQuery, QueryResult<Tag>> {
  constructor(private readonly tagService: TagService) {}

  async handle(query: GetTagQuery): Promise<QueryResult<Tag>> {
    try {
      const tag = await this.tagService.getTagById(
        query.tagId,
        query.workspaceId,
      );

      if (!tag) {
        throw new TagNotFoundError(query.tagId, query.workspaceId);
      }

      return QueryResult.success(tag);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : "Failed to get tag",
      );
    }
  }
}
