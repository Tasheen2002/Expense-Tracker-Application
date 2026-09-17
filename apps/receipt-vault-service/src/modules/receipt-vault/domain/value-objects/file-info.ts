import {
  MAX_FILE_SIZE,
  MIN_FILE_SIZE,
  MAX_FILE_NAME_LENGTH,
  MIME_TYPE_REGEX,
  ALLOWED_MIME_TYPES,
} from '../constants/receipt.constants'
import {
  InvalidFileError,
  FileSizeExceededError,
  InvalidMimeTypeError,
  ReceiptValidationError,
} from '../errors/receipt.errors'

export interface FileInfoProps {
  fileName: string
  originalName: string
  filePath: string
  fileSize: number
  mimeType: string
  fileHash?: string
}

export class FileInfo {
  private constructor(private readonly props: FileInfoProps) {
    this.validate()
  }

  static create(props: FileInfoProps): FileInfo {
    return new FileInfo(props)
  }

  private validate(): void {
    if (!this.props.fileName || this.props.fileName.trim().length === 0) {
      throw new ReceiptValidationError('fileName', 'File name cannot be empty')
    }

    if (this.props.fileName.length > MAX_FILE_NAME_LENGTH) {
      throw new ReceiptValidationError(
        'fileName',
        `File name cannot exceed ${MAX_FILE_NAME_LENGTH} characters`
      )
    }

    if (!this.props.originalName || this.props.originalName.trim().length === 0) {
      throw new ReceiptValidationError('originalName', 'Original file name cannot be empty')
    }

    if (this.props.originalName.length > MAX_FILE_NAME_LENGTH) {
      throw new ReceiptValidationError(
        'originalName',
        `Original file name cannot exceed ${MAX_FILE_NAME_LENGTH} characters`
      )
    }

    if (!this.props.filePath || this.props.filePath.trim().length === 0) {
      throw new ReceiptValidationError('filePath', 'File path cannot be empty')
    }

    if (this.props.fileSize < MIN_FILE_SIZE) {
      throw new InvalidFileError('File size must be greater than zero')
    }

    if (this.props.fileSize > MAX_FILE_SIZE) {
      throw new FileSizeExceededError(this.props.fileSize, MAX_FILE_SIZE)
    }

    if (!this.props.mimeType || this.props.mimeType.trim().length === 0) {
      throw new ReceiptValidationError('mimeType', 'MIME type cannot be empty')
    }

    // Validate MIME type format
    if (!this.isValidMimeType(this.props.mimeType)) {
      throw new InvalidFileError('Invalid MIME type format')
    }

    // Validate MIME type is allowed
    if (!ALLOWED_MIME_TYPES.includes(this.props.mimeType)) {
      throw new InvalidMimeTypeError(this.props.mimeType, ALLOWED_MIME_TYPES)
    }
  }

  private isValidMimeType(mimeType: string): boolean {
    return MIME_TYPE_REGEX.test(mimeType)
  }

  getFileName(): string {
    return this.props.fileName
  }

  getOriginalName(): string {
    return this.props.originalName
  }

  getFilePath(): string {
    return this.props.filePath
  }

  getFileSize(): number {
    return this.props.fileSize
  }

  getMimeType(): string {
    return this.props.mimeType
  }

  getFileHash(): string | undefined {
    return this.props.fileHash
  }

  isImage(): boolean {
    return this.props.mimeType.startsWith('image/')
  }

  isPdf(): boolean {
    return this.props.mimeType === 'application/pdf'
  }

  getFileSizeInMB(): number {
    return this.props.fileSize / (1024 * 1024)
  }

  getFileExtension(): string {
    const parts = this.props.fileName.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  }
}
