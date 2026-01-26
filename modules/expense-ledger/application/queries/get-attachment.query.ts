import { AttachmentService } from '../services/attachment.service'
import { Attachment } from '../../domain/entities/attachment.entity'

export interface GetAttachmentDto {
  attachmentId: string
  expenseId: string
  workspaceId: string
}

export class GetAttachmentHandler {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(dto: GetAttachmentDto): Promise<Attachment> {
    const attachment = await this.attachmentService.getAttachmentById(dto.attachmentId)

    if (!attachment) {
      throw new Error('Attachment not found')
    }

    // Verify attachment belongs to the specified expense
    if (attachment.expenseId !== dto.expenseId) {
      throw new Error('Attachment not found')
    }

    return attachment
  }
}
