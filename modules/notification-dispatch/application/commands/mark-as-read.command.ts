import { NotificationService } from '../services/notification.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface MarkAsReadCommand extends ICommand {
  notificationId: string;
  userId: string;
}

export class MarkAsReadHandler implements ICommandHandler<
  MarkAsReadCommand,
  CommandResult<void>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(input: MarkAsReadCommand): Promise<CommandResult<void>> {
    try {
      await this.notificationService.markAsRead(
        input.notificationId,
        input.userId
      );
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
