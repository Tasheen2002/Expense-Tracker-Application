import { ReceiptService } from '../services/receipt.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface AddReceiptTagCommand extends ICommand {
  receiptId: string;
  tagId: string;
  workspaceId: string;
  userId: string;
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
