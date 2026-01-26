import { AttachmentService } from '../services/attachment.service'
import { Attachment } from '../../domain/entities/attachment.entity'

export interface ListAttachmentsDto {
  expenseId: string
  workspaceId: string
}

export class ListAttachmentsHandler {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(dto: ListAttachmentsDto): Promise<Attachment[]> {
    return await this.attachmentService.getAttachmentsByExpense(dto.expenseId)
  }
}
