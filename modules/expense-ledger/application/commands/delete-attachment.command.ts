import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { AttachmentService } from '../services/attachment.service';
import { ExpenseService } from '../services/expense.service';
import { AttachmentId } from '../../domain/value-objects/attachment-id';

export interface DeleteAttachmentCommand extends ICommand {
  readonly attachmentId: string;
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class DeleteAttachmentHandler implements ICommandHandler<
  DeleteAttachmentCommand,
  CommandResult<void>
> {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly expenseService: ExpenseService
  ) {}

  async handle(command: DeleteAttachmentCommand): Promise<CommandResult<void>> {
    try {
      await this.expenseService.removeAttachmentRecord(
        command.expenseId,
        command.workspaceId,
        AttachmentId.fromString(command.attachmentId)
      );

      await this.attachmentService.deleteAttachment(
        command.attachmentId,
        command.expenseId
      );
      return CommandResult.success();
    } catch (error) {
      return CommandResult.failure(
        error instanceof Error ? error.message : 'Failed to delete attachment'
      );
    }
  }
}
