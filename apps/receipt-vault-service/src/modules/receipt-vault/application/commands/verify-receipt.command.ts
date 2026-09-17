import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface VerifyReceiptCommand extends ICommand {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class VerifyReceiptHandler implements ICommandHandler<
  VerifyReceiptCommand,
  CommandResult<ReceiptDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: VerifyReceiptCommand): Promise<CommandResult<ReceiptDTO>> {
    const receiptDTO = await this.receiptService.verifyReceipt(
      command.receiptId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(receiptDTO);
  }
}
