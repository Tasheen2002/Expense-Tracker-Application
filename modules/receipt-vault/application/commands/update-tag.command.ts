import { TagService } from '../services/tag.service'
import { ReceiptTagDefinition } from '../../domain/entities/receipt-tag-definition.entity'

export interface UpdateTagDto {
  tagId: string
  workspaceId: string
  name?: string
  color?: string
  description?: string
}

export class UpdateTagHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(dto: UpdateTagDto): Promise<ReceiptTagDefinition> {
    return await this.tagService.updateTag(dto.tagId, dto.workspaceId, {
      name: dto.name,
      color: dto.color,
      description: dto.description,
    })
  }
}
