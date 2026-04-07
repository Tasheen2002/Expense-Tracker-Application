import { ReceiptService } from '../services/receipt.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RemoveReceiptTagCommand extends ICommand {
  receiptId: string;
  tagId: string;
  workspaceId: string;
  userId: string;
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
