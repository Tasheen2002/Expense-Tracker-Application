import { ReceiptService } from '../services/receipt.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface RemoveReceiptTagCommand extends ICommand {
  readonly receiptId: string;
  readonly tagId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class RemoveReceiptTagHandler implements ICommandHandler<
  RemoveReceiptTagCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: RemoveReceiptTagCommand): Promise<CommandResult<void>> {
    await this.receiptService.removeTag(
      command.receiptId,
      command.tagId,
      command.workspaceId,
      command.userId,
    );
    return CommandResult.success();
  }
}
