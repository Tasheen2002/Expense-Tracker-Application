import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateAttachmentHandler } from '../../../application/commands/create-attachment.command';
import { DeleteAttachmentHandler } from '../../../application/commands/delete-attachment.command';
import { GetAttachmentHandler } from '../../../application/queries/get-attachment.query';
import { ListAttachmentsHandler } from '../../../application/queries/list-attachments.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class AttachmentController {
  constructor(
    private readonly createAttachmentHandler: CreateAttachmentHandler,
    private readonly deleteAttachmentHandler: DeleteAttachmentHandler,
    private readonly getAttachmentHandler: GetAttachmentHandler,
    private readonly listAttachmentsHandler: ListAttachmentsHandler
  ) {}

  async createAttachment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        fileName: string;
        filePath: string;
        fileSize: number;
        mimeType: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId, expenseId } = request.params;

      const result = await this.createAttachmentHandler.handle({
        expenseId,
        workspaceId,
        fileName: request.body.fileName,
        filePath: request.body.filePath,
        fileSize: request.body.fileSize,
        mimeType: request.body.mimeType,
        uploadedBy: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Attachment created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteAttachment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string; attachmentId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId, attachmentId } = request.params;

      const result = await this.deleteAttachmentHandler.handle({
        attachmentId,
        expenseId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Attachment deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAttachment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string; attachmentId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId, attachmentId } = request.params;

      const result = await this.getAttachmentHandler.handle({
        attachmentId,
        expenseId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Attachment retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listAttachments(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const result = await this.listAttachmentsHandler.handle({
        expenseId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Attachments retrieved successfully',
        result.data
          ? { items: result.data.map((attachment) => attachment.toJSON()) }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
