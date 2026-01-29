import {
  IReceiptRepository,
  ReceiptFilters,
} from "../../domain/repositories/receipt.repository";
import { IReceiptMetadataRepository } from "../../domain/repositories/receipt-metadata.repository";
import { IReceiptTagRepository } from "../../domain/repositories/receipt-tag.repository";
import { Receipt } from "../../domain/entities/receipt.entity";
import { ReceiptMetadata } from "../../domain/entities/receipt-metadata.entity";
import { ReceiptId } from "../../domain/value-objects/receipt-id";
import { TagId } from "../../domain/value-objects/tag-id";
import { StorageLocation } from "../../domain/value-objects/storage-location";
import { ReceiptType } from "../../domain/enums/receipt-type";
import { ReceiptStatus } from "../../domain/enums/receipt-status";
import {
  ReceiptNotFoundError,
  DuplicateReceiptError,
  ReceiptMetadataNotFoundError,
  ReceiptMetadataAlreadyExistsError,
  DeletedReceiptError,
} from "../../domain/errors/receipt.errors";
import { UnauthorizedAccessError } from "../../domain/errors/unauthorized-access.error";
import { UpdateReceiptMetadataDto } from "../commands/update-receipt-metadata.command";

export class ReceiptService {
  constructor(
    private readonly receiptRepository: IReceiptRepository,
    private readonly metadataRepository: IReceiptMetadataRepository,
    private readonly tagRepository: IReceiptTagRepository,
  ) {}

  async uploadReceipt(params: {
    workspaceId: string;
    userId: string;
    fileName: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    fileHash?: string;
    receiptType?: ReceiptType;
    storageLocation: StorageLocation;
  }): Promise<Receipt> {
    // Check for duplicate by file hash
    if (params.fileHash) {
      const existing = await this.receiptRepository.findByFileHash(
        params.fileHash,
        params.workspaceId,
      );

      if (existing && !existing.isDeleted()) {
        throw new DuplicateReceiptError(params.fileHash);
      }
    }

    const receipt = Receipt.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      fileName: params.fileName,
      originalName: params.originalName,
      filePath: params.filePath,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      fileHash: params.fileHash,
      receiptType: params.receiptType,
      storageLocation: params.storageLocation,
    });

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async getReceipt(
    receiptId: string,
    workspaceId: string,
  ): Promise<Receipt | null> {
    return await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );
  }

  async getReceiptsByWorkspace(workspaceId: string): Promise<Receipt[]> {
    return await this.receiptRepository.findByWorkspace(workspaceId);
  }

  async getReceiptsByExpense(
    expenseId: string,
    workspaceId: string,
  ): Promise<Receipt[]> {
    return await this.receiptRepository.findByExpenseId(expenseId, workspaceId);
  }

  async getReceiptsByUser(
    userId: string,
    workspaceId: string,
  ): Promise<Receipt[]> {
    return await this.receiptRepository.findByUserId(userId, workspaceId);
  }

  async filterReceipts(filters: ReceiptFilters): Promise<Receipt[]> {
    return await this.receiptRepository.findByFilters(filters);
  }

  async filterReceiptsPaginated(
    filters: ReceiptFilters & { page?: number; pageSize?: number },
  ): Promise<{
    data: Receipt[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Get total count
    const total = await this.receiptRepository.countByFilters(filters);

    // Get paginated results
    const data = await this.receiptRepository.findByFilters({
      ...filters,
      skip,
      take: pageSize,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async linkToExpense(
    receiptId: string,
    expenseId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    if (receipt.isDeleted()) {
      throw new DeletedReceiptError(receiptId);
    }

    receipt.linkToExpense(expenseId);

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async unlinkFromExpense(
    receiptId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    receipt.unlinkFromExpense();

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async processReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
    ocrText?: string,
    ocrConfidence?: number,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    if (receipt.isPending()) {
      receipt.startProcessing();
      await this.receiptRepository.save(receipt);
    }

    // Simulate OCR processing
    receipt.markAsProcessed(ocrText, ocrConfidence);

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async markProcessingFailed(
    receiptId: string,
    workspaceId: string,
    userId: string,
    reason: string,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    receipt.markAsFailed(reason);

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async verifyReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    receipt.verify();

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async rejectReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
    reason?: string,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    receipt.reject(reason);

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async setThumbnail(
    receiptId: string,
    thumbnailPath: string,
    workspaceId: string,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    receipt.setThumbnailPath(thumbnailPath);

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  async deleteReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
    permanent: boolean = false,
  ): Promise<void> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    if (permanent) {
      // Transactional delete of receipt and dependencies
      await this.receiptRepository.deleteWithDependencies(
        receipt.getId(),
        workspaceId,
      );
    } else {
      // Soft delete
      receipt.softDelete();
      await this.receiptRepository.save(receipt);
    }
  }

  async restoreReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    receipt.restore();

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  // Metadata management
  async addMetadata(params: {
    receiptId: string;
    workspaceId: string;
    userId: string;
    merchantName?: string;
    merchantAddress?: string;
    transactionDate?: Date;
    totalAmount?: number | string;
    currency?: string;
    invoiceNumber?: string;
    [key: string]: any;
  }): Promise<ReceiptMetadata> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(params.receiptId),
      params.workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(params.receiptId, params.workspaceId);
    }

    if (receipt.getUserId() !== params.userId) {
      throw new UnauthorizedAccessError(params.userId, params.receiptId);
    }

    // Check if metadata already exists
    const existing = await this.metadataRepository.findByReceiptId(
      receipt.getId(),
    );
    if (existing) {
      throw new ReceiptMetadataAlreadyExistsError(params.receiptId);
    }

    const metadata = ReceiptMetadata.create(params);

    await this.metadataRepository.save(metadata);

    return metadata;
  }

  async updateMetadata(
    receiptId: string,
    workspaceId: string,
    userId: string,
    updates: UpdateReceiptMetadataDto,
  ): Promise<ReceiptMetadata> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    const metadata = await this.metadataRepository.findByReceiptId(
      receipt.getId(),
    );

    if (!metadata) {
      throw new ReceiptMetadataNotFoundError(receiptId);
    }

    // Apply updates
    if (
      updates.merchantName !== undefined ||
      updates.merchantAddress !== undefined ||
      updates.merchantPhone !== undefined ||
      updates.merchantTaxId !== undefined
    ) {
      metadata.updateMerchantInfo({
        name: updates.merchantName,
        address: updates.merchantAddress,
        phone: updates.merchantPhone,
        taxId: updates.merchantTaxId,
      });
    }

    if (
      updates.subtotal !== undefined ||
      updates.taxAmount !== undefined ||
      updates.tipAmount !== undefined ||
      updates.totalAmount !== undefined ||
      updates.currency !== undefined
    ) {
      metadata.updateFinancialAmounts({
        subtotal: updates.subtotal,
        taxAmount: updates.taxAmount,
        tipAmount: updates.tipAmount,
        totalAmount: updates.totalAmount,
        currency: updates.currency,
      });
    }

    if (
      updates.transactionDate !== undefined ||
      updates.transactionTime !== undefined
    ) {
      metadata.updateTransactionInfo(
        updates.transactionDate,
        updates.transactionTime,
      );
    }

    if (updates.notes !== undefined) {
      metadata.updateNotes(updates.notes);
    }

    await this.metadataRepository.save(metadata);

    return metadata;
  }

  async getMetadata(
    receiptId: string,
    workspaceId: string,
  ): Promise<ReceiptMetadata | null> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      return null;
    }

    return await this.metadataRepository.findByReceiptId(receipt.getId());
  }

  // Tag management
  async addTag(
    receiptId: string,
    tagId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    const hasTag = await this.tagRepository.hasTag(
      receipt.getId(),
      TagId.fromString(tagId),
    );

    if (hasTag) {
      return; // Already has this tag
    }

    await this.tagRepository.addTag(receipt.getId(), TagId.fromString(tagId));
  }

  async removeTag(
    receiptId: string,
    tagId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (receipt.getUserId() !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    await this.tagRepository.removeTag(
      receipt.getId(),
      TagId.fromString(tagId),
    );
  }

  async getReceiptTags(
    receiptId: string,
    workspaceId: string,
  ): Promise<TagId[]> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId,
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    return await this.tagRepository.findTagsByReceipt(receipt.getId());
  }

  // Statistics
  async getReceiptStats(workspaceId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    processed: number;
    failed: number;
    verified: number;
  }> {
    const [total, pending, processing, processed, failed, verified] =
      await Promise.all([
        this.receiptRepository.countByWorkspace(workspaceId),
        this.receiptRepository.countByStatus(
          workspaceId,
          ReceiptStatus.PENDING,
        ),
        this.receiptRepository.countByStatus(
          workspaceId,
          ReceiptStatus.PROCESSING,
        ),
        this.receiptRepository.countByStatus(
          workspaceId,
          ReceiptStatus.PROCESSED,
        ),
        this.receiptRepository.countByStatus(workspaceId, ReceiptStatus.FAILED),
        this.receiptRepository.countByStatus(
          workspaceId,
          ReceiptStatus.VERIFIED,
        ),
      ]);

    return { total, pending, processing, processed, failed, verified };
  }
}
