import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateAttachmentHandler,
  DeleteAttachmentHandler,
  GetAttachmentHandler,
  ListAttachmentsHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import { CreateAttachmentInput } from '../validation/attachment.schema';

export class AttachmentController {
  constructor(
    private readonly createAttachmentHandler: CreateAttachmentHandler,
    private readonly deleteAttachmentHandler: DeleteAttachmentHandler,
    private readonly getAttachmentHandler: GetAttachmentHandler,
    private readonly listAttachmentsHandler: ListAttachmentsHandler
  ) {}

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

      return ResponseHelper.ok(reply, 'Attachment retrieved successfully', result);
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

      return ResponseHelper.ok(reply, 'Attachments retrieved successfully', { items: result });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createAttachment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: CreateAttachmentInput;
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
        'Attachment deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
