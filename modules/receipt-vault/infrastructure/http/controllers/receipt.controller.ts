import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { UploadReceiptHandler } from '../../../application/commands/upload-receipt.command';
import { LinkReceiptToExpenseHandler } from '../../../application/commands/link-receipt-to-expense.command';
import { UnlinkReceiptFromExpenseHandler } from '../../../application/commands/unlink-receipt-from-expense.command';
import { ProcessReceiptHandler } from '../../../application/commands/process-receipt.command';
import { VerifyReceiptHandler } from '../../../application/commands/verify-receipt.command';
import { RejectReceiptHandler } from '../../../application/commands/reject-receipt.command';
import { DeleteReceiptHandler } from '../../../application/commands/delete-receipt.command';
import { AddReceiptMetadataHandler } from '../../../application/commands/add-receipt-metadata.command';
import { UpdateReceiptMetadataHandler } from '../../../application/commands/update-receipt-metadata.command';
import { AddReceiptTagHandler } from '../../../application/commands/add-receipt-tag.command';
import { RemoveReceiptTagHandler } from '../../../application/commands/remove-receipt-tag.command';
import { GetReceiptHandler } from '../../../application/queries/get-receipt.query';
import { ListReceiptsHandler } from '../../../application/queries/list-receipts.query';
import { GetReceiptsByExpenseHandler } from '../../../application/queries/get-receipts-by-expense.query';
import { GetReceiptMetadataHandler } from '../../../application/queries/get-receipt-metadata.query';
import { GetReceiptStatsHandler } from '../../../application/queries/get-receipt-stats.query';
import type {
  UploadReceiptInput,
  LinkToExpenseInput,
  ProcessReceiptInput,
  RejectReceiptInput,
  ListReceiptsQuery,
  DeleteReceiptQuery,
} from '../validation/receipt.schema';
import type {
  AddMetadataInput,
  UpdateMetadataInput,
} from '../validation/metadata.schema';
import type { AddTagToReceiptInput } from '../validation/tag.schema';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class ReceiptController {
  constructor(
    private readonly uploadReceiptHandler: UploadReceiptHandler,
    private readonly linkReceiptHandler: LinkReceiptToExpenseHandler,
    private readonly unlinkReceiptHandler: UnlinkReceiptFromExpenseHandler,
    private readonly processReceiptHandler: ProcessReceiptHandler,
    private readonly verifyReceiptHandler: VerifyReceiptHandler,
    private readonly rejectReceiptHandler: RejectReceiptHandler,
    private readonly deleteReceiptHandler: DeleteReceiptHandler,
    private readonly addMetadataHandler: AddReceiptMetadataHandler,
    private readonly updateMetadataHandler: UpdateReceiptMetadataHandler,
    private readonly addTagHandler: AddReceiptTagHandler,
    private readonly removeTagHandler: RemoveReceiptTagHandler,
    private readonly getReceiptHandler: GetReceiptHandler,
    private readonly listReceiptsHandler: ListReceiptsHandler,
    private readonly getReceiptsByExpenseHandler: GetReceiptsByExpenseHandler,
    private readonly getMetadataHandler: GetReceiptMetadataHandler,
    private readonly getStatsHandler: GetReceiptStatsHandler
  ) {}

  async uploadReceipt(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = request.user.userId;
    const { workspaceId } = request.params as { workspaceId: string };

    try {
      const result = await this.uploadReceiptHandler.handle({
        workspaceId,
        userId,
        ...(request.body as Omit<UploadReceiptInput, 'workspaceId' | 'userId'>),
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Receipt uploaded successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getReceipt(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, receiptId } = request.params as {
      workspaceId: string;
      receiptId: string;
    };

    try {
      const result = await this.getReceiptHandler.handle({
        receiptId,
        workspaceId,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Receipt retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listReceipts(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string };
    const query = request.query as ListReceiptsQuery;

    try {
      const result = await this.listReceiptsHandler.handle({
        workspaceId,
        userId: query.userId,
        expenseId: query.expenseId,
        status: query.status,
        receiptType: query.receiptType,
        isLinked: query.isLinked,
        isDeleted: query.isDeleted,
        fromDate: query.fromDate,
        toDate: query.toDate,
        limit: query.limit,
        offset: query.offset,
      });
      const paginatedData = result.data;
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Receipts retrieved successfully',
        {
          items: paginatedData?.items.map((r) => r.toJSON()) ?? [],
          pagination: {
            total: paginatedData?.total ?? 0,
            limit: paginatedData?.limit ?? 0,
            offset: paginatedData?.offset ?? 0,
            hasMore: paginatedData?.hasMore ?? false,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getReceiptsByExpense(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const { workspaceId, expenseId } = request.params as {
      workspaceId: string;
      expenseId: string;
    };

    try {
      const result = await this.getReceiptsByExpenseHandler.handle({
        expenseId,
        workspaceId,
      });
      const paginatedData = result.data;
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Receipts retrieved successfully',
        {
          receipts: paginatedData?.items.map((r) => r.toJSON()) ?? [],
          pagination: {
            total: paginatedData?.total ?? 0,
            limit: paginatedData?.limit ?? 0,
            offset: paginatedData?.offset ?? 0,
            hasMore: paginatedData?.hasMore ?? false,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async linkToExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: LinkToExpenseInput;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;
    const { expenseId } = request.body;

    try {
      const result = await this.linkReceiptHandler.handle({
        receiptId,
        expenseId,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Receipt linked to expense successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async unlinkFromExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.unlinkReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Receipt unlinked from expense successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async processReceipt(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: ProcessReceiptInput;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.processReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
        ocrText: request.body.ocrText,
        ocrConfidence: request.body.ocrConfidence,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Receipt processed successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async verifyReceipt(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.verifyReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Receipt verified successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectReceipt(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: RejectReceiptInput;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.rejectReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
        reason: request.body.reason,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Receipt rejected successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteReceipt(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
      Querystring: DeleteReceiptQuery;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;
    const { permanent } = request.query;

    try {
      const result = await this.deleteReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
        permanent,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        permanent
          ? 'Receipt permanently deleted'
          : 'Receipt deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addMetadata(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: AddMetadataInput;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.addMetadataHandler.handle({
        receiptId,
        workspaceId,
        userId,
        ...request.body,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Metadata added successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateMetadata(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: UpdateMetadataInput;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.updateMetadataHandler.handle({
        receiptId,
        workspaceId,
        userId,
        ...request.body,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Metadata updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getMetadata(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.getMetadataHandler.handle({
        receiptId,
        workspaceId,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Metadata retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: AddTagToReceiptInput;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId } = request.params;
    const { tagId } = request.body;

    try {
      const result = await this.addTagHandler.handle({
        receiptId,
        tagId,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Tag added to receipt successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async removeTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; receiptId: string; tagId: string };
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId, receiptId, tagId } = request.params;

    try {
      const result = await this.removeTagHandler.handle({
        receiptId,
        tagId,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Tag removed from receipt successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getStats(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;

    try {
      const result = await this.getStatsHandler.handle({ workspaceId });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Receipt statistics retrieved successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
