import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { TagService } from '../services/tag.service';
import { TagDTO } from '../../domain/entities/tag.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListTagsQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListTagsHandler implements IQueryHandler<
  ListTagsQuery,
  QueryResult<PaginatedResult<TagDTO>>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(
    query: ListTagsQuery
  ): Promise<QueryResult<PaginatedResult<TagDTO>>> {
    const result = await this.tagService.getTagsByWorkspace(query.workspaceId, {
      limit: query.limit,
      offset: query.offset,
    });
    return QueryResult.success({
      ...result,
      items: result.items.map((tag) => tag.toJSON()),
    });
  }
}
