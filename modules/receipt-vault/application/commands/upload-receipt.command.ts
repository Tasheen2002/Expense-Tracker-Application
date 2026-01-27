import { ReceiptService } from '../services/receipt.service'
import { Receipt } from '../../domain/entities/receipt.entity'
import { StorageLocation } from '../../domain/value-objects/storage-location'
import { ReceiptType } from '../../domain/enums/receipt-type'

export interface UploadReceiptDto {
  workspaceId: string
  userId: string
  fileName: string
  originalName: string
  filePath: string
  fileSize: number
  mimeType: string
  fileHash?: string
  receiptType?: ReceiptType
  storageProvider: string
  storageBucket?: string
  storageKey?: string
}

export class UploadReceiptHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: UploadReceiptDto): Promise<Receipt> {
    const storageLocation = StorageLocation.create({
      provider: dto.storageProvider as any,
      bucket: dto.storageBucket,
      key: dto.storageKey,
    })

    return await this.receiptService.uploadReceipt({
      workspaceId: dto.workspaceId,
      userId: dto.userId,
      fileName: dto.fileName,
      originalName: dto.originalName,
      filePath: dto.filePath,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      fileHash: dto.fileHash,
      receiptType: dto.receiptType,
      storageLocation,
    })
  }
}
