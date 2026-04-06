import { NotificationService } from '../services/notification.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface MarkAllAsReadCommand extends ICommand {
  recipientId: string;
  workspaceId: string;
}

export class MarkAllAsReadHandler implements ICommandHandler<
  MarkAllAsReadCommand,
  CommandResult<void>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(input: MarkAllAsReadCommand): Promise<CommandResult<void>> {
    try {
      await this.notificationService.markAllAsRead(
        input.recipientId,
        input.workspaceId
      );
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
