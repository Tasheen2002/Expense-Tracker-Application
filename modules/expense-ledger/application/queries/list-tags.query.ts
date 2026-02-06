import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ListTagsQuery {
  constructor(public readonly workspaceId: string) {}
}

export class ListTagsHandler {
  constructor(private readonly tagService: any) {}

  async handle(query: ListTagsQuery): Promise<PaginatedResult<any>> {
    return await this.tagService.getTagsByWorkspace(query.workspaceId);
  }
}
