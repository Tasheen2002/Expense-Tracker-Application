import { TagService } from '../services/tag.service'
import { ReceiptTagDefinition } from '../../domain/entities/receipt-tag-definition.entity'

export interface ListTagsDto {
  workspaceId: string
}

export class ListTagsHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(dto: ListTagsDto): Promise<ReceiptTagDefinition[]> {
    return await this.tagService.getTagsByWorkspace(dto.workspaceId)
  }
}
