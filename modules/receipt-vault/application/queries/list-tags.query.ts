import { TagService } from '../services/tag.service';
import { ReceiptTagDefinitionDTO } from '../../domain/entities/receipt-tag-definition.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListTagsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class ListTagsHandler implements IQueryHandler<
  ListTagsQuery,
  QueryResult<PaginatedResult<ReceiptTagDefinitionDTO>>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(
    query: ListTagsQuery,
  ): Promise<QueryResult<PaginatedResult<ReceiptTagDefinitionDTO>>> {
    const result = await this.tagService.getTagsByWorkspace(
      query.workspaceId,
      query.options,
    );
    return QueryResult.success(result);
  }
}
