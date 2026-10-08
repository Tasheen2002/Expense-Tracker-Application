import { ReceiptMetadataCommandFields } from '../receipt-inputs';
import { ReceiptService } from '../services/receipt.service';
import { ReceiptMetadataDTO } from '../../domain/entities/receipt-metadata.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface AddReceiptMetadataCommand
  extends ICommand, ReceiptMetadataCommandFields {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class AddReceiptMetadataHandler implements ICommandHandler<
  AddReceiptMetadataCommand,
  CommandResult<ReceiptMetadataDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: AddReceiptMetadataCommand
  ): Promise<CommandResult<ReceiptMetadataDTO>> {
    const metadataDTO = await this.receiptService.addMetadata(command);
    return CommandResult.success(metadataDTO);
  }
}
