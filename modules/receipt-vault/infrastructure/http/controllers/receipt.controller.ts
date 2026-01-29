import { FastifyRequest, FastifyReply } from "fastify";
import { UploadReceiptHandler } from "../../../application/commands/upload-receipt.command";
import { LinkReceiptToExpenseHandler } from "../../../application/commands/link-receipt-to-expense.command";
import { UnlinkReceiptFromExpenseHandler } from "../../../application/commands/unlink-receipt-from-expense.command";
import { ProcessReceiptHandler } from "../../../application/commands/process-receipt.command";
import { VerifyReceiptHandler } from "../../../application/commands/verify-receipt.command";
import { RejectReceiptHandler } from "../../../application/commands/reject-receipt.command";
import { DeleteReceiptHandler } from "../../../application/commands/delete-receipt.command";
import { AddReceiptMetadataHandler } from "../../../application/commands/add-receipt-metadata.command";
import { UpdateReceiptMetadataHandler } from "../../../application/commands/update-receipt-metadata.command";
import { AddReceiptTagHandler } from "../../../application/commands/add-receipt-tag.command";
import { RemoveReceiptTagHandler } from "../../../application/commands/remove-receipt-tag.command";
import { GetReceiptHandler } from "../../../application/queries/get-receipt.query";
import { ListReceiptsHandler } from "../../../application/queries/list-receipts.query";
import { GetReceiptsByExpenseHandler } from "../../../application/queries/get-receipts-by-expense.query";
import { GetReceiptMetadataHandler } from "../../../application/queries/get-receipt-metadata.query";
import { GetReceiptStatsHandler } from "../../../application/queries/get-receipt-stats.query";
import { Receipt } from "../../../domain/entities/receipt.entity";
import { ReceiptMetadata } from "../../../domain/entities/receipt-metadata.entity";
import type {
  UploadReceiptInput,
  LinkToExpenseInput,
  ProcessReceiptInput,
  RejectReceiptInput,
  ListReceiptsQuery,
  DeleteReceiptQuery,
} from "../validation/receipt.schema";
import type {
  AddMetadataInput,
  UpdateMetadataInput,
} from "../validation/metadata.schema";
import type { AddTagToReceiptInput } from "../validation/tag.schema";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

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
    private readonly getStatsHandler: GetReceiptStatsHandler,
  ) {}

  async uploadReceipt(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Body: UploadReceiptInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId } = request.params;

    try {
      const receipt = await this.uploadReceiptHandler.handle({
        workspaceId,
        userId,
        ...request.body,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Receipt uploaded successfully",
        data: this.serializeReceipt(receipt),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getReceipt(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, receiptId } = request.params;

    try {
      const receipt = await this.getReceiptHandler.handle({
        receiptId,
        workspaceId,
      });

      if (!receipt) {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          message: "Receipt not found",
        });
      }

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipt retrieved successfully",
        data: this.serializeReceipt(receipt),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listReceipts(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Querystring: ListReceiptsQuery;
    }>,
    reply: FastifyReply,
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
        page: query.page,
        pageSize: query.pageSize,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipts retrieved successfully",
        data: result.data.map((receipt) => this.serializeReceipt(receipt)),
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getReceiptsByExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, expenseId } = request.params;

    try {
      const receipts = await this.getReceiptsByExpenseHandler.handle({
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipts retrieved successfully",
        data: receipts.map((receipt) => this.serializeReceipt(receipt)),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async linkToExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: LinkToExpenseInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;
    const { expenseId } = request.body;

    try {
      const receipt = await this.linkReceiptHandler.handle({
        receiptId,
        expenseId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipt linked to expense successfully",
        data: this.serializeReceipt(receipt),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async unlinkFromExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;

    try {
      const receipt = await this.unlinkReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipt unlinked from expense successfully",
        data: this.serializeReceipt(receipt),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async processReceipt(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: ProcessReceiptInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;

    try {
      const receipt = await this.processReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
        ocrText: request.body.ocrText,
        ocrConfidence: request.body.ocrConfidence,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipt processed successfully",
        data: this.serializeReceipt(receipt),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async verifyReceipt(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;

    try {
      const receipt = await this.verifyReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipt verified successfully",
        data: this.serializeReceipt(receipt),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectReceipt(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: RejectReceiptInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;

    try {
      const receipt = await this.rejectReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
        reason: request.body.reason,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipt rejected successfully",
        data: this.serializeReceipt(receipt),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteReceipt(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
      Querystring: DeleteReceiptQuery;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;
    const { permanent } = request.query;

    try {
      await this.deleteReceiptHandler.handle({
        receiptId,
        workspaceId,
        userId,
        permanent,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: permanent
          ? "Receipt permanently deleted"
          : "Receipt deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addMetadata(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: AddMetadataInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;

    try {
      const metadata = await this.addMetadataHandler.handle({
        receiptId,
        workspaceId,
        userId,
        ...request.body,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Metadata added successfully",
        data: this.serializeMetadata(metadata),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateMetadata(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: UpdateMetadataInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;

    try {
      const metadata = await this.updateMetadataHandler.handle({
        receiptId,
        workspaceId,
        userId,
        ...request.body,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Metadata updated successfully",
        data: this.serializeMetadata(metadata),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getMetadata(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, receiptId } = request.params;

    try {
      const metadata = await this.getMetadataHandler.handle({
        receiptId,
        workspaceId,
      });

      if (!metadata) {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          message: "Metadata not found",
        });
      }

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Metadata retrieved successfully",
        data: this.serializeMetadata(metadata),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addTag(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string };
      Body: AddTagToReceiptInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId } = request.params;
    const { tagId } = request.body;

    try {
      await this.addTagHandler.handle({
        receiptId,
        tagId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Tag added to receipt successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async removeTag(
    request: FastifyRequest<{
      Params: { workspaceId: string; receiptId: string; tagId: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, receiptId, tagId } = request.params;

    try {
      await this.removeTagHandler.handle({
        receiptId,
        tagId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Tag removed from receipt successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getStats(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params;

    try {
      const stats = await this.getStatsHandler.handle({ workspaceId });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Receipt statistics retrieved successfully",
        data: stats,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeReceipt(receipt: Receipt) {
    const fileInfo = receipt.getFileInfo();
    const storageLocation = receipt.getStorageLocation();

    return {
      receiptId: receipt.getId().getValue(),
      workspaceId: receipt.getWorkspaceId(),
      expenseId: receipt.getExpenseId(),
      userId: receipt.getUserId(),
      fileName: fileInfo.getFileName(),
      originalName: fileInfo.getOriginalName(),
      filePath: fileInfo.getFilePath(),
      fileSize: fileInfo.getFileSize(),
      mimeType: fileInfo.getMimeType(),
      fileHash: fileInfo.getFileHash(),
      receiptType: receipt.getReceiptType(),
      status: receipt.getStatus(),
      storageProvider: storageLocation.getProvider(),
      storageBucket: storageLocation.getBucket(),
      storageKey: storageLocation.getKey(),
      thumbnailPath: receipt.getThumbnailPath(),
      ocrText: receipt.getOcrText(),
      ocrConfidence: receipt.getOcrConfidence()?.toString(),
      processedAt: receipt.getProcessedAt()?.toISOString(),
      failureReason: receipt.getFailureReason(),
      isLinked: receipt.isLinkedToExpense(),
      isDeleted: receipt.isDeleted(),
      createdAt: receipt.getCreatedAt().toISOString(),
      updatedAt: receipt.getUpdatedAt().toISOString(),
      deletedAt: receipt.getDeletedAt()?.toISOString(),
    };
  }

  private serializeMetadata(metadata: ReceiptMetadata) {
    return {
      metadataId: metadata.getId().getValue(),
      receiptId: metadata.getReceiptId().getValue(),
      merchantName: metadata.getMerchantName(),
      merchantAddress: metadata.getMerchantAddress(),
      merchantPhone: metadata.getMerchantPhone(),
      merchantTaxId: metadata.getMerchantTaxId(),
      transactionDate: metadata.getTransactionDate()?.toISOString(),
      transactionTime: metadata.getTransactionTime(),
      subtotal: metadata.getSubtotal()?.toString(),
      taxAmount: metadata.getTaxAmount()?.toString(),
      tipAmount: metadata.getTipAmount()?.toString(),
      totalAmount: metadata.getTotalAmount()?.toString(),
      currency: metadata.getCurrency(),
      paymentMethod: metadata.getPaymentMethod(),
      lastFourDigits: metadata.getLastFourDigits(),
      invoiceNumber: metadata.getInvoiceNumber(),
      poNumber: metadata.getPoNumber(),
      lineItems: metadata.getLineItems(),
      notes: metadata.getNotes(),
      customFields: metadata.getCustomFields(),
      createdAt: metadata.getCreatedAt().toISOString(),
      updatedAt: metadata.getUpdatedAt().toISOString(),
    };
  }
}
