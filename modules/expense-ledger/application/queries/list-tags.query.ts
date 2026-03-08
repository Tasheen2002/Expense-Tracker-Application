import { IQuery, IQueryHandler, QueryResult } from "../../../../apps/api/src/shared/application";
import { TagService } from "../services/tag.service";
import { Tag } from "../../domain/entities/tag.entity";

export interface ListTagsQuery extends IQuery {
  readonly workspaceId: string;
}

export class ListTagsHandler implements IQueryHandler<ListTagsQuery, QueryResult<Tag[]>> {
  constructor(private readonly tagService: TagService) {}

  async handle(query: ListTagsQuery): Promise<QueryResult<Tag[]>> {
    try {
      const result = await this.tagService.getTagsByWorkspace(query.workspaceId);
      return QueryResult.success(result.items);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : "Failed to list tags",
      );
    }
  }
}
