import { TagService } from '../services/tag.service'
import { ReceiptTagDefinition } from '../../domain/entities/receipt-tag-definition.entity'

export interface CreateTagDto {
  workspaceId: string
  name: string
  color?: string
  description?: string
}

export class CreateTagHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(dto: CreateTagDto): Promise<ReceiptTagDefinition> {
    return await this.tagService.createTag(dto)
  }
}
