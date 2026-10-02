import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import {
  CreateAttachmentHandler,
  DeleteAttachmentHandler,
  GetAttachmentHandler,
  ListAttachmentsHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import { z } from 'zod';
import { CreateAttachmentInput } from '../validation/attachment.schema';
import { paginationQuerySchema } from '../validation/common.schema';
import { WorkspaceRole } from '../../../application/ports/workspace-authorization.port';

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export class AttachmentController {
  constructor(
    private readonly createAttachmentHandler: CreateAttachmentHandler,
    private readonly deleteAttachmentHandler: DeleteAttachmentHandler,
    private readonly getAttachmentHandler: GetAttachmentHandler,
    private readonly listAttachmentsHandler: ListAttachmentsHandler
  ) {}

  private getVerifiedMembership(
    request: AuthenticatedRequest,
    userId: string,
    workspaceId: string
  ) {
    if (
      request.workspaceMembership &&
      request.workspaceMembership.workspaceId === workspaceId
    ) {
      return {
        userId,
        workspaceId,
        role: request.workspaceMembership.role as WorkspaceRole,
      };
    }
    return undefined;
  }

  async getAttachment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string; attachmentId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { attachmentId, expenseId, workspaceId } = request.params;
      const userId = request.user?.userId || request.user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const result = await this.getAttachmentHandler.handle({
        attachmentId,
        expenseId,
        workspaceId,
        userId,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.ok(reply, 'Attachment retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listAttachments(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;
      const { limit, offset } = request.query;
      const userId = request.user?.userId || request.user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const result = await this.listAttachmentsHandler.handle({
        expenseId,
        workspaceId,
        userId,
        limit,
        offset,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.ok(reply, 'Attachments retrieved successfully', result);
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
        'Attachment metadata registered successfully',
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
        userId: request.user.userId,
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
