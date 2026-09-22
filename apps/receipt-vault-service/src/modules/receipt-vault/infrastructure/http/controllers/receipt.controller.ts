import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  UploadReceiptHandler,
  LinkReceiptToExpenseHandler,
  UnlinkReceiptFromExpenseHandler,
  ProcessReceiptHandler,
  VerifyReceiptHandler,
  RejectReceiptHandler,
  DeleteReceiptHandler,
  AddReceiptMetadataHandler,
  UpdateReceiptMetadataHandler,
  AddReceiptTagHandler,
  RemoveReceiptTagHandler,
  GetReceiptHandler,
  ListReceiptsHandler,
  GetReceiptsByExpenseHandler,
  GetReceiptMetadataHandler,
  GetReceiptStatsHandler,
} from '@modules/receipt-vault/application';
import type {
  WorkspaceParams,
  ReceiptParams,
  ReceiptTagParams,
  ExpenseParams,
} from '../validation/common.schema';
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
import { ResponseHelper } from '@shared/response.helper';

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

  async getReceipt(
    request: AuthenticatedRequest<{ Params: ReceiptParams }>,
    reply: FastifyReply
  ) {
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.getReceiptHandler.handle({
        receiptId,
        workspaceId,
      });
      return ResponseHelper.ok(reply, 'Receipt retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listReceipts(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: ListReceiptsQuery;
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const query = request.query;

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
      return ResponseHelper.ok(reply, 'Receipts retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getReceiptsByExpense(
    request: AuthenticatedRequest<{ Params: ExpenseParams }>,
    reply: FastifyReply
  ) {
    const { workspaceId, expenseId } = request.params;

    try {
      const result = await this.getReceiptsByExpenseHandler.handle({
        expenseId,
        workspaceId,
      });
      return ResponseHelper.ok(reply, 'Receipts retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getMetadata(
    request: AuthenticatedRequest<{ Params: ReceiptParams }>,
    reply: FastifyReply
  ) {
    const { workspaceId, receiptId } = request.params;

    try {
      const result = await this.getMetadataHandler.handle({
        receiptId,
        workspaceId,
      });
      return ResponseHelper.ok(reply, 'Metadata retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getStats(
    request: AuthenticatedRequest<{ Params: WorkspaceParams }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;

    try {
      const result = await this.getStatsHandler.handle({ workspaceId });
      return ResponseHelper.ok(reply, 'Receipt statistics retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async uploadReceipt(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: UploadReceiptInput;
    }>,
    reply: FastifyReply
  ) {
    const userId = request.user.userId;
    const { workspaceId } = request.params;

    try {
      const result = await this.uploadReceiptHandler.handle({
        workspaceId,
        userId,
        ...request.body,
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

  async linkToExpense(
    request: AuthenticatedRequest<{
      Params: ReceiptParams;
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
        'Receipt linked to expense successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async unlinkFromExpense(
    request: AuthenticatedRequest<{ Params: ReceiptParams }>,
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
      Params: ReceiptParams;
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
        'Receipt processed successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async verifyReceipt(
    request: AuthenticatedRequest<{ Params: ReceiptParams }>,
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
        'Receipt verified successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectReceipt(
    request: AuthenticatedRequest<{
      Params: ReceiptParams;
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
        'Receipt rejected successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteReceipt(
    request: AuthenticatedRequest<{
      Params: ReceiptParams;
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
      Params: ReceiptParams;
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
      Params: ReceiptParams;
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
        'Metadata updated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addTag(
    request: AuthenticatedRequest<{
      Params: ReceiptParams;
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
    request: AuthenticatedRequest<{ Params: ReceiptTagParams }>,
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
}
