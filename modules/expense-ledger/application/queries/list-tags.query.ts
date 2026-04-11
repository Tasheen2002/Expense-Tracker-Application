import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { TagService } from '../services/tag.service';
import { TagDTO } from '../../domain/entities/tag.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListTagsQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListTagsHandler implements IQueryHandler<ListTagsQuery, PaginatedResult<TagDTO>> {
  constructor(private readonly tagService: TagService) {}

  async handle(query: ListTagsQuery): Promise<PaginatedResult<TagDTO>> {
    return this.tagService.getTagsByWorkspace(query.workspaceId, {
      limit: query.limit,
      offset: query.offset,
    });
  }
}
