import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { AttachmentService } from '../services/attachment.service';
import { AttachmentDTO } from '../../domain/entities/attachment.entity';
import { AttachmentNotFoundError } from '../../domain/errors/expense.errors';

export interface GetAttachmentQuery extends IQuery {
  readonly attachmentId: string;
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class GetAttachmentHandler implements IQueryHandler<
  GetAttachmentQuery,
  QueryResult<AttachmentDTO>
> {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(query: GetAttachmentQuery): Promise<QueryResult<AttachmentDTO>> {
    const attachment = await this.attachmentService.getAttachmentDTOById(
      query.attachmentId
    );

    if (!attachment) {
      throw new AttachmentNotFoundError(query.attachmentId);
    }

    if (attachment.expenseId !== query.expenseId) {
      throw new AttachmentNotFoundError(query.attachmentId);
    }

    return QueryResult.success(attachment);
  }
}
