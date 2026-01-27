import { TagService } from '../services/tag.service'

export interface DeleteTagDto {
  tagId: string
  workspaceId: string
}

export class DeleteTagHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(dto: DeleteTagDto): Promise<void> {
    return await this.tagService.deleteTag(dto.tagId, dto.workspaceId)
  }
}
