import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { Attachment } from '../../domain/entities/attachment.entity';
import { AttachmentId } from '../../domain/value-objects/attachment-id';
import {
  AttachmentNotFoundError,
  FileSizeLimitExceededError,
} from '../../domain/errors/expense.errors';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export class AttachmentService {
  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async createAttachment(params: {
    expenseId: string;
    workspaceId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
  }): Promise<Attachment> {
    // Check total attachment size limit (50MB per expense)
    const currentTotalSize =
      await this.attachmentRepository.getTotalSizeByExpense(params.expenseId);
    const maxTotalSize = 50 * 1024 * 1024; // 50MB
    if (currentTotalSize + params.fileSize > maxTotalSize) {
      throw new FileSizeLimitExceededError(
        currentTotalSize + params.fileSize,
        maxTotalSize
      );
    }

    const attachment = Attachment.create({
      expenseId: params.expenseId,
      fileName: params.fileName,
      filePath: params.filePath,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      uploadedBy: params.uploadedBy,
    });

    await this.attachmentRepository.save(attachment);

    return attachment;
  }

  async deleteAttachment(
    attachmentId: string,
    expenseId: string
  ): Promise<void> {
    const attachment = await this.attachmentRepository.findById(
      AttachmentId.fromString(attachmentId)
    );

    if (!attachment) {
      throw new AttachmentNotFoundError(attachmentId);
    }

    // Verify attachment belongs to the specified expense
    if (attachment.expenseId !== expenseId) {
      throw new AttachmentNotFoundError(attachmentId);
    }

    await this.attachmentRepository.delete(
      AttachmentId.fromString(attachmentId)
    );
  }

  async getAttachmentById(attachmentId: string): Promise<Attachment | null> {
    return await this.attachmentRepository.findById(
      AttachmentId.fromString(attachmentId)
    );
  }

  async getAttachmentsByExpense(
    expenseId: string
  ): Promise<PaginatedResult<Attachment>> {
    return await this.attachmentRepository.findByExpense(expenseId);
  }

  async getTotalSizeByExpense(expenseId: string): Promise<number> {
    return await this.attachmentRepository.getTotalSizeByExpense(expenseId);
  }
}
