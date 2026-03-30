import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { TagService } from '../services/tag.service';
import { Tag } from '../../domain/entities/tag.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface ListTagsQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListTagsHandler implements IQueryHandler<
  ListTagsQuery,
  QueryResult<PaginatedResult<Tag>>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(
    query: ListTagsQuery
  ): Promise<QueryResult<PaginatedResult<Tag>>> {
    const result = await this.tagService.getTagsByWorkspace(query.workspaceId, {
      limit: query.limit,
      offset: query.offset,
    });
    return QueryResult.success(result);
  }
}
