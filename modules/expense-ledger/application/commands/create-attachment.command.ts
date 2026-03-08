import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { AttachmentService } from '../services/attachment.service';
import { ExpenseService } from '../services/expense.service';
import { AttachmentId } from '../../domain/value-objects/attachment-id';
import { Attachment } from '../../domain/entities/attachment.entity';

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
  CommandResult<Attachment>
> {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly expenseService: ExpenseService
  ) {}

  async handle(
    command: CreateAttachmentCommand
  ): Promise<CommandResult<Attachment>> {
    try {
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
        AttachmentId.fromString(attachment.id.getValue())
      );

      return CommandResult.success(attachment);
    } catch (error) {
      return CommandResult.failure<Attachment>(
        error instanceof Error ? error.message : 'Failed to create attachment'
      );
    }
  }
}
