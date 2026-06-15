import { TagService } from '../services/tag.service';
import { ReceiptTagDefinitionDTO } from '../../domain/entities/receipt-tag-definition.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ListTagsQuery extends IQuery {
  readonly workspaceId: string;
  readonly options?: PaginationOptions;
}

export class ListTagsHandler implements IQueryHandler<ListTagsQuery, PaginatedResult<ReceiptTagDefinitionDTO>> {
  constructor(private readonly tagService: TagService) {}

  async handle(query: ListTagsQuery): Promise<PaginatedResult<ReceiptTagDefinitionDTO>> {
    return this.tagService.getTagsByWorkspace(query.workspaceId, query.options);
  }
}
