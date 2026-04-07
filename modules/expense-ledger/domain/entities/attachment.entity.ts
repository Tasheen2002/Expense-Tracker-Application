import { AttachmentId } from '../value-objects/attachment-id';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../apps/api/src/shared/domain/events';
import {
  FileNameRequiredError,
  FileNameTooLongError,
  FilePathRequiredError,
  FilePathTooLongError,
  FileSizeInvalidError,
  FileSizeLimitExceededError,
  MimeTypeRequiredError,
  MimeTypeTooLongError,
  InvalidFileTypeError,
} from '../errors/expense.errors';

export class AttachmentUploadedEvent extends DomainEvent {
  constructor(
    public readonly attachmentId: string,
    public readonly expenseId: string,
    public readonly fileName: string,
    public readonly uploadedBy: string
  ) {
    super(attachmentId, 'Attachment');
  }
  get eventType(): string { return 'attachment.uploaded'; }
  getPayload(): Record<string, unknown> {
    return { attachmentId: this.attachmentId, expenseId: this.expenseId, fileName: this.fileName, uploadedBy: this.uploadedBy };
  }
}

export interface AttachmentProps {
  id: AttachmentId;
  expenseId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
}

export class Attachment extends AggregateRoot {
  private readonly props: AttachmentProps;

  private constructor(props: AttachmentProps) {
    super();
    this.props = props;
  }

  static create(props: Omit<AttachmentProps, 'id' | 'createdAt'>): Attachment {
    this.validateFileName(props.fileName);
    this.validateFilePath(props.filePath);
    this.validateFileSize(props.fileSize);
    this.validateMimeType(props.mimeType);

    const attachment = new Attachment({
      ...props,
      id: AttachmentId.create(),
      createdAt: new Date(),
    });

    attachment.addDomainEvent(
      new AttachmentUploadedEvent(attachment.id.getValue(), attachment.expenseId, attachment.fileName, attachment.uploadedBy)
    );

    return attachment;
  }

  static fromPersistence(props: AttachmentProps): Attachment {
    return new Attachment(props);
  }

  // Validation methods
  private static validateFileName(fileName: string): void {
    if (!fileName || fileName.trim().length === 0) {
      throw new FileNameRequiredError();
    }
    if (fileName.length > 255) {
      throw new FileNameTooLongError(255);
    }
  }

  private static validateFilePath(filePath: string): void {
    if (!filePath || filePath.trim().length === 0) {
      throw new FilePathRequiredError();
    }
    if (filePath.length > 500) {
      throw new FilePathTooLongError(500);
    }
  }

  private static validateFileSize(fileSize: number): void {
    if (fileSize <= 0) {
      throw new FileSizeInvalidError();
    }
    // Max file size: 10MB
    const maxFileSize = 10 * 1024 * 1024;
    if (fileSize > maxFileSize) {
      throw new FileSizeLimitExceededError(fileSize, maxFileSize);
    }
  }

  private static validateMimeType(mimeType: string): void {
    if (!mimeType || mimeType.trim().length === 0) {
      throw new MimeTypeRequiredError();
    }
    if (mimeType.length > 100) {
      throw new MimeTypeTooLongError(100);
    }

    // Validate allowed MIME types for receipts and documents
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new InvalidFileTypeError(mimeType, allowedMimeTypes);
    }
  }

  // Getters
  get id(): AttachmentId {
    return this.props.id;
  }

  get expenseId(): string {
    return this.props.expenseId;
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get filePath(): string {
    return this.props.filePath;
  }

  get fileSize(): number {
    return this.props.fileSize;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get uploadedBy(): string {
    return this.props.uploadedBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // Helper methods
  isImage(): boolean {
    return this.props.mimeType.startsWith('image/');
  }

  isPDF(): boolean {
    return this.props.mimeType === 'application/pdf';
  }

  isDocument(): boolean {
    return (
      this.props.mimeType === 'application/msword' ||
      this.props.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  isSpreadsheet(): boolean {
    return (
      this.props.mimeType === 'application/vnd.ms-excel' ||
      this.props.mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  getFileSizeInKB(): number {
    return Math.round(this.props.fileSize / 1024);
  }

  getFileSizeInMB(): number {
    return Math.round((this.props.fileSize / (1024 * 1024)) * 100) / 100;
  }

  toJSON(): AttachmentDTO {
    return {
      attachmentId: this.id.getValue(),
      expenseId: this.expenseId,
      fileName: this.fileName,
      filePath: this.filePath,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      uploadedBy: this.uploadedBy,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

export interface AttachmentDTO {
  attachmentId: string;
  expenseId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}
