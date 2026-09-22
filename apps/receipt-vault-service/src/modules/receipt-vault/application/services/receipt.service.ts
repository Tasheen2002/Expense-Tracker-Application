import {
  IReceiptRepository,
  ReceiptFilters,
} from '../../domain/repositories/receipt.repository';
import { IReceiptMetadataRepository } from '../../domain/repositories/receipt-metadata.repository';
import { IReceiptTagRepository } from '../../domain/repositories/receipt-tag.repository';
import { IFileStorageService } from '../../domain/ports/file-storage.port';
import { Receipt, ReceiptDTO } from '../../domain/entities/receipt.entity';
import { ReceiptMetadata, ReceiptMetadataDTO } from '../../domain/entities/receipt-metadata.entity';
import { ReceiptId } from '../../domain/value-objects/receipt-id';
import { TagId } from '../../domain/value-objects/tag-id';
import { StorageLocation } from '../../domain/value-objects/storage-location';
import { ReceiptType } from '../../domain/enums/receipt-type';
import { ReceiptStatus } from '../../domain/enums/receipt-status';
import {
  ReceiptNotFoundError,
  DuplicateReceiptError,
  ReceiptMetadataNotFoundError,
  ReceiptMetadataAlreadyExistsError,
  DeletedReceiptError,
  ReceiptMissingStorageKeyError,
} from '../../domain/errors/receipt.errors';
import { UnauthorizedAccessError } from '../../domain/errors/unauthorized-access.error';
import { UpdateReceiptMetadataDto } from '../commands/update-receipt-metadata.command';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class ReceiptService {
  constructor(
    private readonly receiptRepository: IReceiptRepository,
    private readonly metadataRepository: IReceiptMetadataRepository,
    private readonly tagRepository: IReceiptTagRepository,
    private readonly fileStorage: IFileStorageService
  ) {}

  private async _getReceiptEntity(
    receiptId: string,
    workspaceId: string,
    userId?: string
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (userId && receipt.userId !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }

    return receipt;
  }

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
  }): Promise<ReceiptDTO> {
    // Check for duplicate by file hash
    if (params.fileHash) {
      const existing = await this.receiptRepository.findByFileHash(
        params.fileHash,
        params.workspaceId
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

    return Receipt.toDTO(receipt);
  }

  async getReceipt(
    receiptId: string,
    workspaceId: string
  ): Promise<ReceiptDTO | null> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId
    );

    if (!receipt) {
      return null;
    }

    return Receipt.toDTO(receipt);
  }

  async getReceiptsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ReceiptDTO>> {
    const result = await this.receiptRepository.findByWorkspace(workspaceId, options);
    return {
      ...result,
      items: result.items.map((r) => Receipt.toDTO(r)),
    };
  }

  async getReceiptsByExpense(
    expenseId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ReceiptDTO>> {
    const result = await this.receiptRepository.findByExpenseId(
      expenseId,
      workspaceId,
      options
    );
    return {
      ...result,
      items: result.items.map((r) => Receipt.toDTO(r)),
    };
  }

  async getReceiptsByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ReceiptDTO>> {
    const result = await this.receiptRepository.findByUserId(
      userId,
      workspaceId,
      options
    );
    return {
      ...result,
      items: result.items.map((r) => Receipt.toDTO(r)),
    };
  }

  async filterReceipts(
    filters: ReceiptFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ReceiptDTO>> {
    const result = await this.receiptRepository.findByFilters(filters, options);
    return {
      ...result,
      items: result.items.map((r) => Receipt.toDTO(r)),
    };
  }

  async linkToExpense(
    receiptId: string,
    expenseId: string,
    workspaceId: string,
    userId: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    if (receipt.isDeleted()) {
      throw new DeletedReceiptError(receiptId);
    }

    receipt.linkToExpense(expenseId);

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  async unlinkFromExpense(
    receiptId: string,
    workspaceId: string,
    userId: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    receipt.unlinkFromExpense();

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  async processReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
    ocrText?: string,
    ocrConfidence?: number
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    if (receipt.isPending()) {
      receipt.startProcessing();
      await this.receiptRepository.save(receipt);
    }

    // Simulate OCR processing
    receipt.markAsProcessed(ocrText, ocrConfidence);

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  async markProcessingFailed(
    receiptId: string,
    workspaceId: string,
    userId: string,
    reason: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    receipt.markAsFailed(reason);

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  async verifyReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    receipt.verify();

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  async rejectReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
    reason?: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    receipt.reject(reason);

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  async setThumbnail(
    receiptId: string,
    thumbnailPath: string,
    workspaceId: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId);

    receipt.setThumbnailPath(thumbnailPath);

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  async deleteReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string,
    permanent: boolean = false
  ): Promise<void> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    if (permanent) {
      // Transactional delete of receipt and dependencies
      await this.receiptRepository.deleteWithDependencies(
        receipt.id,
        workspaceId
      );

      // Clean up file storage
      const storageLocation = receipt.storageLocation;
      const bucket = storageLocation.getBucket() || 'local';
      const key = storageLocation.getKey();

      if (key) {
        try {
          await this.fileStorage.delete(key, bucket);
        } catch (error) {
          // Log but don't fail as the DB delete succeeded
          console.error(
            `Failed to delete file for receipt ${receiptId}:`,
            error
          );
        }
      }
    } else {
      // Soft delete
      receipt.softDelete();
      await this.receiptRepository.save(receipt);
    }
  }

  async restoreReceipt(
    receiptId: string,
    workspaceId: string,
    userId: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    receipt.restore();

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
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
  }): Promise<ReceiptMetadataDTO> {
    const receipt = await this._getReceiptEntity(params.receiptId, params.workspaceId, params.userId);

    // Check if metadata already exists
    const existing = await this.metadataRepository.findByReceiptId(
      receipt.id
    );
    if (existing) {
      throw new ReceiptMetadataAlreadyExistsError(params.receiptId);
    }

    const metadata = ReceiptMetadata.create(params);

    await this.metadataRepository.save(metadata);

    return ReceiptMetadata.toDTO(metadata);
  }

  async updateMetadata(
    receiptId: string,
    workspaceId: string,
    userId: string,
    updates: UpdateReceiptMetadataDto
  ): Promise<ReceiptMetadataDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    const metadata = await this.metadataRepository.findByReceiptId(
      receipt.id
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
        updates.transactionTime
      );
    }

    if (updates.notes !== undefined) {
      metadata.updateNotes(updates.notes);
    }

    await this.metadataRepository.save(metadata);

    return ReceiptMetadata.toDTO(metadata);
  }

  async getMetadata(
    receiptId: string,
    workspaceId: string
  ): Promise<ReceiptMetadataDTO | null> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId
    );

    if (!receipt) {
      return null;
    }

    const metadata = await this.metadataRepository.findByReceiptId(receipt.id);
    if (!metadata) {
      return null;
    }

    return ReceiptMetadata.toDTO(metadata);
  }

  // Tag management
  async addTag(
    receiptId: string,
    tagId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    const hasTag = await this.tagRepository.hasTag(
      receipt.id,
      TagId.fromString(tagId)
    );

    if (hasTag) {
      return; // Already has this tag
    }

    await this.tagRepository.addTag(receipt.id, TagId.fromString(tagId));
  }

  async removeTag(
    receiptId: string,
    tagId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    await this.tagRepository.removeTag(
      receipt.id,
      TagId.fromString(tagId)
    );
  }

  async getReceiptTags(
    receiptId: string,
    workspaceId: string
  ): Promise<TagId[]> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId);

    return await this.tagRepository.findTagsByReceipt(receipt.id);
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
    const counts = await this.receiptRepository.getStatusCounts(workspaceId);

    const pending = counts[ReceiptStatus.PENDING] || 0;
    const processing = counts[ReceiptStatus.PROCESSING] || 0;
    const processed = counts[ReceiptStatus.PROCESSED] || 0;
    const failed = counts[ReceiptStatus.FAILED] || 0;
    const verified = counts[ReceiptStatus.VERIFIED] || 0;
    const total = pending + processing + processed + failed + verified;

    return { total, pending, processing, processed, failed, verified };
  }

  async getDownloadUrl(
    receiptId: string,
    workspaceId: string,
    userId: string
  ): Promise<string> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    const storageLocation = receipt.storageLocation;
    const bucket = storageLocation.getBucket() || 'local';
    const key = storageLocation.getKey();

    if (!key) {
      throw new ReceiptMissingStorageKeyError(receiptId);
    }

    return await this.fileStorage.generateSignedUrl(key, bucket);
  }
}
