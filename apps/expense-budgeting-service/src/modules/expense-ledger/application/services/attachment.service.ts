import { IAttachmentRepository } from '../../domain/repositories/attachment.repository';
import { Attachment, AttachmentDTO } from '../../domain/entities/attachment.entity';
import { AttachmentId } from '../../domain/value-objects/attachment-id';
import {
  AttachmentNotFoundError,
  FileSizeLimitExceededError,
} from '../../domain/errors/expense.errors';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export class AttachmentService {
  constructor(private readonly attachmentRepository: IAttachmentRepository) {}

  async createAttachment(params: {
    expenseId: string;
    workspaceId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
  }): Promise<AttachmentDTO> {
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

    return Attachment.toDTO(attachment);
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

  async getAttachmentDTOById(attachmentId: string): Promise<AttachmentDTO | null> {
    const attachment = await this.attachmentRepository.findById(
      AttachmentId.fromString(attachmentId)
    );
    return attachment ? Attachment.toDTO(attachment) : null;
  }

  async getAttachmentDTOsByExpense(
    expenseId: string
  ): Promise<PaginatedResult<AttachmentDTO>> {
    const result = await this.attachmentRepository.findByExpense(expenseId);
    return {
      ...result,
      items: result.items.map((a) => Attachment.toDTO(a)),
    };
  }
}
