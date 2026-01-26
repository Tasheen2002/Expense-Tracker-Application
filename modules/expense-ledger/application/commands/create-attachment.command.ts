import { AttachmentService } from '../services/attachment.service'
import { Attachment } from '../../domain/entities/attachment.entity'

export interface CreateAttachmentDto {
  expenseId: string
  workspaceId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadedBy: string
}

export class CreateAttachmentHandler {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(dto: CreateAttachmentDto): Promise<Attachment> {
    return await this.attachmentService.createAttachment(dto)
  }
}
