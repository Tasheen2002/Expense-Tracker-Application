import { ReceiptService } from '../services/receipt.service';
import {
  ReceiptMetadataInput,
  ReceiptMetadataCommandFields,
} from '../receipt-inputs';
import { ReceiptMetadataDTO } from '../../domain/entities/receipt-metadata.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateReceiptMetadataCommand
  extends ICommand, ReceiptMetadataCommandFields {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

// Keep DTO alias for backward compatibility with service
export type UpdateReceiptMetadataDto = ReceiptMetadataInput;

export class UpdateReceiptMetadataHandler implements ICommandHandler<
  UpdateReceiptMetadataCommand,
  CommandResult<ReceiptMetadataDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: UpdateReceiptMetadataCommand
  ): Promise<CommandResult<ReceiptMetadataDTO>> {
    const metadataDTO = await this.receiptService.updateMetadata(
      command.receiptId,
      command.workspaceId,
      command.userId,
      command
    );
    return CommandResult.success(metadataDTO);
  }
}
