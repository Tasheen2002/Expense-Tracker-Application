import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import { StorageLocation } from '../../domain/value-objects/storage-location';
import { ReceiptType } from '../../domain/enums/receipt-type';
import { StorageProvider } from '../../domain/enums/storage-provider';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UploadReceiptCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly fileName: string;
  readonly originalName: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly fileHash?: string;
  readonly receiptType?: ReceiptType;
  readonly storageProvider: string;
  readonly storageBucket?: string;
  readonly storageKey?: string;
}

export class UploadReceiptHandler implements ICommandHandler<
  UploadReceiptCommand,
  CommandResult<ReceiptDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: UploadReceiptCommand
  ): Promise<CommandResult<ReceiptDTO>> {
    const storageLocation = StorageLocation.create({
      provider: command.storageProvider as StorageProvider,
      bucket: command.storageBucket,
      key: command.storageKey,
    });

    const receiptDTO = await this.receiptService.uploadReceipt({
      workspaceId: command.workspaceId,
      userId: command.userId,
      fileName: command.fileName,
      originalName: command.originalName,
      filePath: command.filePath,
      fileSize: command.fileSize,
      mimeType: command.mimeType,
      fileHash: command.fileHash,
      receiptType: command.receiptType,
      storageLocation,
    });
    return CommandResult.success(receiptDTO);
  }
}
