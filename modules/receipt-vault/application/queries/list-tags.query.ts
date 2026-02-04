import { TagService } from "../services/tag.service";
import { ReceiptTagDefinition } from "../../domain/entities/receipt-tag-definition.entity";

import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ListTagsDto {
  workspaceId: string;
  options?: PaginationOptions;
}

export class ListTagsHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(
    dto: ListTagsDto,
  ): Promise<PaginatedResult<ReceiptTagDefinition>> {
    return await this.tagService.getTagsByWorkspace(
      dto.workspaceId,
      dto.options,
    );
  }
}
