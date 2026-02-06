import { AttachmentService } from "../services/attachment.service";
import { Attachment } from "../../domain/entities/attachment.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ListAttachmentsDto {
  expenseId: string;
  workspaceId: string;
}

export class ListAttachmentsHandler {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(dto: ListAttachmentsDto): Promise<PaginatedResult<Attachment>> {
    return await this.attachmentService.getAttachmentsByExpense(dto.expenseId);
  }
}
