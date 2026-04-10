import { TagService } from '../services/tag.service';
import { ReceiptTagDefinitionDTO } from '../../domain/entities/receipt-tag-definition.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListTagsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class ListTagsHandler implements IQueryHandler<ListTagsQuery, PaginatedResult<ReceiptTagDefinitionDTO>> {
  constructor(private readonly tagService: TagService) {}

  async handle(query: ListTagsQuery): Promise<PaginatedResult<ReceiptTagDefinitionDTO>> {
    return this.tagService.getTagsByWorkspace(query.workspaceId, query.options);
  }
}
