import { AttachmentService } from '../services/attachment.service'

export interface DeleteAttachmentDto {
  attachmentId: string
  expenseId: string
  workspaceId: string
}

export class DeleteAttachmentHandler {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(dto: DeleteAttachmentDto): Promise<void> {
    await this.attachmentService.deleteAttachment(
      dto.attachmentId,
      dto.expenseId,
      dto.workspaceId
    )
  }
}
