import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { CreateAttachmentHandler } from "../../../application/commands/create-attachment.command";
import { DeleteAttachmentHandler } from "../../../application/commands/delete-attachment.command";
import { GetAttachmentHandler } from "../../../application/queries/get-attachment.query";
import { ListAttachmentsHandler } from "../../../application/queries/list-attachments.query";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class AttachmentController {
  constructor(
    private readonly createAttachmentHandler: CreateAttachmentHandler,
    private readonly deleteAttachmentHandler: DeleteAttachmentHandler,
    private readonly getAttachmentHandler: GetAttachmentHandler,
    private readonly listAttachmentsHandler: ListAttachmentsHandler,
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
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, expenseId } = request.params;

      const attachment = await this.createAttachmentHandler.handle({
        expenseId,
        workspaceId,
        fileName: request.body.fileName,
        filePath: request.body.filePath,
        fileSize: request.body.fileSize,
        mimeType: request.body.mimeType,
        uploadedBy: userId,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Attachment created successfully",
        data: {
          attachmentId: attachment.id.getValue(),
          expenseId: attachment.expenseId,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: attachment.uploadedBy,
          createdAt: attachment.createdAt.toISOString(),
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteAttachment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string; attachmentId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId, attachmentId } = request.params;

      await this.deleteAttachmentHandler.handle({
        attachmentId,
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Attachment deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAttachment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string; attachmentId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId, attachmentId } = request.params;

      const attachment = await this.getAttachmentHandler.handle({
        attachmentId,
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Attachment retrieved successfully",
        data: {
          attachmentId: attachment.id.getValue(),
          expenseId: attachment.expenseId,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: attachment.uploadedBy,
          createdAt: attachment.createdAt.toISOString(),
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listAttachments(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const attachments = await this.listAttachmentsHandler.handle({
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Attachments retrieved successfully",
        data: attachments.map((attachment) => ({
          attachmentId: attachment.id.getValue(),
          expenseId: attachment.expenseId,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: attachment.uploadedBy,
          createdAt: attachment.createdAt.toISOString(),
        })),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
