import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { AttachmentService } from '../services/attachment.service';
import { ExpenseService } from '../services/expense.service';
import { AttachmentId } from '../../domain/value-objects/attachment-id';
import { IUnitOfWork } from '../ports/unit-of-work.port';

export interface DeleteAttachmentCommand extends ICommand {
  readonly attachmentId: string;
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteAttachmentHandler implements ICommandHandler<
  DeleteAttachmentCommand,
  CommandResult<void>
> {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly expenseService: ExpenseService,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async handle(command: DeleteAttachmentCommand): Promise<CommandResult<void>> {
    return this.unitOfWork.execute(async () => {
      await this.expenseService.removeAttachmentRecord(
        command.expenseId,
        command.workspaceId,
        command.userId,
        AttachmentId.fromString(command.attachmentId)
      );
      await this.attachmentService.deleteAttachment(
        command.attachmentId,
        command.expenseId,
        command.workspaceId
      );
      return CommandResult.success();
    });
  }
}
