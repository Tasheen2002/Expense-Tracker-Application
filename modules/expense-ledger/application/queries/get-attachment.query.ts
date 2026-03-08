import { IQuery, IQueryHandler, QueryResult } from "../../../../apps/api/src/shared/application";
import { AttachmentService } from "../services/attachment.service";
import { Attachment } from "../../domain/entities/attachment.entity";
import { AttachmentNotFoundError } from "../../domain/errors/expense.errors";

export interface GetAttachmentQuery extends IQuery {
  readonly attachmentId: string;
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class GetAttachmentHandler implements IQueryHandler<GetAttachmentQuery, QueryResult<Attachment>> {
  constructor(private readonly attachmentService: AttachmentService) {}

  async handle(query: GetAttachmentQuery): Promise<QueryResult<Attachment>> {
    try {
      const attachment = await this.attachmentService.getAttachmentById(query.attachmentId);

      if (!attachment) {
        throw new AttachmentNotFoundError(query.attachmentId);
      }

      if (attachment.expenseId !== query.expenseId) {
        throw new AttachmentNotFoundError(query.attachmentId);
      }

      return QueryResult.success(attachment);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : "Failed to get attachment",
      );
    }
  }
}
