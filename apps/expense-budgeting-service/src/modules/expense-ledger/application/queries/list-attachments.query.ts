import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { AttachmentService } from '../services/attachment.service';
import { AttachmentDTO } from '../../domain/entities/attachment.entity';

export interface ListAttachmentsQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class ListAttachmentsHandler implements IQueryHandler<ListAttachmentsQuery, AttachmentDTO[]> {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(query: ListAttachmentsQuery): Promise<AttachmentDTO[]> {
    const result = await this.attachmentService.getAttachmentDTOsByExpense(
      query.expenseId
    );
    return result.items;
  }
}
