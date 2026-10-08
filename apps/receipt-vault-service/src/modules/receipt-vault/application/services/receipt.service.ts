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
import { ReceiptMetadataInput, pagination } from '../receipt-inputs';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

import { createHash } from 'node:crypto';
import { IExpenseReferencePort } from '../ports/expense-reference.port';
import { StorageProvider } from '../../domain/enums/storage-provider';
import { InvalidFileError } from '../../domain/errors/receipt.errors';
import { MAX_FILE_SIZE } from '../../domain/constants/receipt.constants';

export class ReceiptService {
  constructor(
    private readonly receiptRepository: IReceiptRepository,
    private readonly metadataRepository: IReceiptMetadataRepository,
    private readonly tagRepository: IReceiptTagRepository,
    private readonly fileStorage: IFileStorageService,
    private readonly expenseReferences?: IExpenseReferencePort
  ) {}

  private async _getReceiptEntity(
    receiptId: string,
    workspaceId: string,
    userId?: string,
    allowDeleted = false
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      ReceiptId.fromString(receiptId),
      workspaceId
    );

    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId, workspaceId);
    }

    if (userId !== undefined && receipt.userId !== userId) {
      throw new UnauthorizedAccessError(userId, receiptId);
    }
    if (receipt.isDeleted() && !allowDeleted) throw new DeletedReceiptError(receiptId);

    return receipt;
  }

  async uploadReceipt(params: {
    workspaceId: string; userId: string; originalName: string; fileContent: string;
    mimeType: string; receiptType?: ReceiptType;
  }): Promise<ReceiptDTO> {
    const content = params.fileContent;
    if (!content || content.length > Math.ceil(MAX_FILE_SIZE / 3) * 4 ||
        content.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(content)) {
      throw new InvalidFileError('Expected bounded canonical base64 file content');
    }
    const bytes = Buffer.from(content, 'base64');
    if (bytes.toString('base64') !== content) throw new InvalidFileError('Invalid base64 encoding');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const existing = await this.receiptRepository.findByFileHash(hash, params.workspaceId);
    if (existing) throw new DuplicateReceiptError(hash);
    const object = await this.fileStorage.upload(bytes, params.originalName, params.mimeType);
    try {
      const receipt = Receipt.create({
        workspaceId: params.workspaceId, userId: params.userId,
        fileName: object.storageKey, originalName: params.originalName,
        filePath: object.storageKey, fileSize: bytes.length, mimeType: params.mimeType,
        fileHash: hash, receiptType: params.receiptType,
        storageLocation: StorageLocation.create({
          provider: StorageProvider.LOCAL, bucket: object.storageBucket, key: object.storageKey,
        }),
      });
      await this.receiptRepository.save(receipt);
      return Receipt.toDTO(receipt);
    } catch (error) {
      try { await this.fileStorage.delete(object.storageKey, object.storageBucket); }
      catch (cleanupError) {
        // The managed local storage reconciliation job retries orphan cleanup after its grace period.
        throw Object.assign(new Error('Receipt persistence failed and file cleanup will be retried'), { errors: [error, cleanupError] });
      }
      throw error;
    }
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
    const result = await this.receiptRepository.findByWorkspace(workspaceId, pagination(options));
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
      pagination(options)
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
      pagination(options)
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
    const result = await this.receiptRepository.findByFilters(filters, pagination(options));
    return {
      ...result,
      items: result.items.map((r) => Receipt.toDTO(r)),
    };
  }

  async linkToExpense(
    receiptId: string,
    expenseId: string,
    workspaceId: string,
    userId: string,
    authToken?: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    if (!this.expenseReferences) throw Object.assign(new Error('Expense verification is unavailable'), { statusCode: 503 });
    await this.expenseReferences.assertInWorkspace(expenseId, workspaceId, userId, authToken);
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

    Receipt.validateProcessingResult(ocrText, ocrConfidence);
    if (receipt.isPending() || receipt.canBeReprocessed()) receipt.startProcessing();

    // Record an externally supplied OCR result; no extraction job is started here.
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
    workspaceId: string,
    userId: string
  ): Promise<ReceiptDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

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
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId, true);

    if (permanent) {
      // Transactional delete of receipt and dependencies
      await this.receiptRepository.deleteWithDependencies(
        receipt.id,
        workspaceId
      );

      // The repository atomically queues durable file deletion with the row deletion.
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
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId, true);

    receipt.restore();

    await this.receiptRepository.save(receipt);

    return Receipt.toDTO(receipt);
  }

  // Metadata management
  async addMetadata(params: ReceiptMetadataInput & {
    receiptId: string;
    workspaceId: string;
    userId: string;
  }): Promise<ReceiptMetadataDTO> {
    const receipt = await this._getReceiptEntity(params.receiptId, params.workspaceId, params.userId);

    // Check if metadata already exists
    const existing = await this.metadataRepository.findByReceiptId(
      receipt.id, receipt.workspaceId
    );
    if (existing) {
      throw new ReceiptMetadataAlreadyExistsError(params.receiptId);
    }

    const metadata = ReceiptMetadata.create(params);

    await this.metadataRepository.save(metadata, receipt.workspaceId);

    return ReceiptMetadata.toDTO(metadata);
  }

  async updateMetadata(
    receiptId: string,
    workspaceId: string,
    userId: string,
    updates: ReceiptMetadataInput
  ): Promise<ReceiptMetadataDTO> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);

    const metadata = await this.metadataRepository.findByReceiptId(
      receipt.id, receipt.workspaceId
    );

    if (!metadata) {
      throw new ReceiptMetadataNotFoundError(receiptId);
    }

    metadata.updateDetails(updates);

    await this.metadataRepository.save(metadata, receipt.workspaceId);

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

    const metadata = await this.metadataRepository.findByReceiptId(receipt.id, receipt.workspaceId);
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
      TagId.fromString(tagId), workspaceId
    );

    if (hasTag) {
      return; // Already has this tag
    }

    await this.tagRepository.addTag(receipt.id, TagId.fromString(tagId), workspaceId);
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
      TagId.fromString(tagId), workspaceId
    );
  }

  async getReceiptTags(
    receiptId: string,
    workspaceId: string
  ): Promise<TagId[]> {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId);

    return await this.tagRepository.findTagsByReceipt(receipt.id, workspaceId);
  }

  // Statistics
  async getReceiptStats(workspaceId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    processed: number;
    failed: number;
    verified: number;
    rejected: number;
  }> {
    const counts = await this.receiptRepository.getStatusCounts(workspaceId);

    const pending = counts[ReceiptStatus.PENDING] || 0;
    const processing = counts[ReceiptStatus.PROCESSING] || 0;
    const processed = counts[ReceiptStatus.PROCESSED] || 0;
    const failed = counts[ReceiptStatus.FAILED] || 0;
    const verified = counts[ReceiptStatus.VERIFIED] || 0;
    const rejected = counts[ReceiptStatus.REJECTED] || 0;
    const total = pending + processing + processed + failed + verified + rejected;

    return { total, pending, processing, processed, failed, verified, rejected };
  }

  async downloadReceipt(receiptId: string, workspaceId: string, userId: string) {
    const receipt = await this._getReceiptEntity(receiptId, workspaceId, userId);
    if (receipt.isDeleted()) throw new DeletedReceiptError(receiptId);
    if (!receipt.storageLocation.isLocal()) throw new InvalidFileError('Unsupported receipt storage provider');
    const key = receipt.storageLocation.getKey();
    if (!key) throw new ReceiptMissingStorageKeyError(receiptId);
    const bytes = await this.fileStorage.download(key, receipt.storageLocation.getBucket() ?? 'local');
    return { bytes, mimeType: receipt.fileInfo.getMimeType(), originalName: receipt.fileInfo.getOriginalName() };
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

    if (receipt.storageLocation.isLocal() || !('generateSignedUrl' in this.fileStorage) || typeof this.fileStorage.generateSignedUrl !== 'function') throw new InvalidFileError('Use the authenticated download endpoint for this storage provider');
    return await this.fileStorage.generateSignedUrl(key, bucket);
  }
}
