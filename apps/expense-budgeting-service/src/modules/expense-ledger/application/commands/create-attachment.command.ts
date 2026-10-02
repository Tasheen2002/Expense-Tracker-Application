import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { AttachmentService } from '../services/attachment.service';
import { ExpenseService } from '../services/expense.service';
import { AttachmentDTO } from '../../domain/entities/attachment.entity';
import { AttachmentId } from '../../domain/value-objects/attachment-id';
import { IUnitOfWork } from '../ports/unit-of-work.port';
import {
  ExpenseNotFoundError,
  UnauthorizedExpenseAccessError,
} from '../../domain/errors/expense.errors';

export interface CreateAttachmentCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly fileName: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly uploadedBy: string;
}

export class CreateAttachmentHandler implements ICommandHandler<
  CreateAttachmentCommand,
  CommandResult<AttachmentDTO>
> {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly expenseService: ExpenseService,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async handle(
    command: CreateAttachmentCommand
  ): Promise<CommandResult<AttachmentDTO>> {
    // 1. Authorize parent expense existence and ownership BEFORE creating attachment
    const expense = await this.expenseService.getExpenseById(
      command.expenseId,
      command.workspaceId
    );
    if (!expense) {
      throw new ExpenseNotFoundError(command.expenseId, command.workspaceId);
    }
    if (expense.userId !== command.uploadedBy) {
      throw new UnauthorizedExpenseAccessError(
        command.expenseId,
        command.uploadedBy,
        'add attachment'
      );
    }

    return this.unitOfWork.execute(async () => {
      const attachment = await this.attachmentService.createAttachment({
        expenseId: command.expenseId,
        workspaceId: command.workspaceId,
        fileName: command.fileName,
        filePath: command.filePath,
        fileSize: command.fileSize,
        mimeType: command.mimeType,
        uploadedBy: command.uploadedBy,
      });
      await this.expenseService.addAttachmentRecord(
        command.expenseId,
        command.workspaceId,
        command.uploadedBy,
        AttachmentId.fromString(attachment.attachmentId)
      );
      return CommandResult.success(attachment);
    });
  }
}

