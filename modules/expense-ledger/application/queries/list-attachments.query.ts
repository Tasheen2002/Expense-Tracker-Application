import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { AttachmentService } from '../services/attachment.service';
import { Attachment } from '../../domain/entities/attachment.entity';

export interface ListAttachmentsQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class ListAttachmentsHandler implements IQueryHandler<
  ListAttachmentsQuery,
  QueryResult<Attachment[]>
> {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(
    query: ListAttachmentsQuery
  ): Promise<QueryResult<Attachment[]>> {
    const result = await this.attachmentService.getAttachmentsByExpense(
      query.expenseId
    );
    return QueryResult.success(result.items);
  }
}
