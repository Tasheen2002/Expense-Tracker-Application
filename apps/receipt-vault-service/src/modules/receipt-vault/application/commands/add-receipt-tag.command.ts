import { ReceiptService } from '../services/receipt.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface AddReceiptTagCommand extends ICommand {
  readonly receiptId: string;
  readonly tagId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class AddReceiptTagHandler implements ICommandHandler<
  AddReceiptTagCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: AddReceiptTagCommand): Promise<CommandResult<void>> {
    await this.receiptService.addTag(
      command.receiptId,
      command.tagId,
      command.workspaceId,
      command.userId,
    );
    return CommandResult.success();
  }
}
