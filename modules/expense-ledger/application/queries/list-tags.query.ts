import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { TagService } from "../services/tag.service";

export class ListTagsQuery {
  constructor(public readonly workspaceId: string) {}
}

export class ListTagsHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(query: ListTagsQuery): Promise<PaginatedResult<any>> {
    return await this.tagService.getTagsByWorkspace(query.workspaceId);
  }
}
