import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { AttachmentService } from '../services/attachment.service';
import { AttachmentDTO } from '../../domain/entities/attachment.entity';

export interface ListAttachmentsQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class ListAttachmentsHandler implements IQueryHandler<
  ListAttachmentsQuery,
  QueryResult<AttachmentDTO[]>
> {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(
    query: ListAttachmentsQuery
  ): Promise<QueryResult<AttachmentDTO[]>> {
    const result = await this.attachmentService.getAttachmentsByExpense(
      query.expenseId
    );
    return QueryResult.success(result.items.map((attachment) => attachment.toJSON()));
  }
}
