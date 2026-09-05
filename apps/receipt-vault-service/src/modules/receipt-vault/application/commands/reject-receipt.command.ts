import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface RejectReceiptCommand extends ICommand {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly reason?: string;
}

export class RejectReceiptHandler implements ICommandHandler<
  RejectReceiptCommand,
  CommandResult<ReceiptDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: RejectReceiptCommand): Promise<CommandResult<ReceiptDTO>> {
    const receiptDTO = await this.receiptService.rejectReceipt(
      command.receiptId,
      command.workspaceId,
      command.userId,
      command.reason
    );
    return CommandResult.success(receiptDTO);
  }
}
