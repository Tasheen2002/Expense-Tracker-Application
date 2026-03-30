import { ReceiptService } from '../services/receipt.service';
import { ReceiptMetadata } from '../../domain/entities/receipt-metadata.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface UpdateReceiptMetadataCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  transactionDate?: Date;
  transactionTime?: string;
  subtotal?: number | string;
  taxAmount?: number | string;
  tipAmount?: number | string;
  totalAmount?: number | string;
  currency?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  invoiceNumber?: string;
  poNumber?: string;
  notes?: string;
}

// Keep DTO alias for backward compatibility with service
export type UpdateReceiptMetadataDto = UpdateReceiptMetadataCommand;

export class UpdateReceiptMetadataHandler implements ICommandHandler<
  UpdateReceiptMetadataCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: UpdateReceiptMetadataCommand
  ): Promise<CommandResult<void>> {
    await this.receiptService.updateMetadata(
      command.receiptId,
      command.workspaceId,
      command.userId,
      command
    );
    return CommandResult.success();
  }
}
