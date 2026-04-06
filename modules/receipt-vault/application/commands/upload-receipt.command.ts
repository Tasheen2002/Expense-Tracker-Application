import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import { StorageLocation } from '../../domain/value-objects/storage-location';
import { ReceiptType } from '../../domain/enums/receipt-type';
import { StorageProvider } from '../../domain/enums/storage-provider';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UploadReceiptCommand extends ICommand {
  workspaceId: string;
  userId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  receiptType?: ReceiptType;
  storageProvider: string;
  storageBucket?: string;
  storageKey?: string;
}

export class UploadReceiptHandler implements ICommandHandler<
  UploadReceiptCommand,
  CommandResult<{ receiptId: string }>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: UploadReceiptCommand
  ): Promise<CommandResult<{ receiptId: string }>> {
    const storageLocation = StorageLocation.create({
      provider: command.storageProvider as StorageProvider,
      bucket: command.storageBucket,
      key: command.storageKey,
    });

    const receipt = await this.receiptService.uploadReceipt({
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
    return CommandResult.success({ receiptId: receipt.getId().getValue() });
  }
}
