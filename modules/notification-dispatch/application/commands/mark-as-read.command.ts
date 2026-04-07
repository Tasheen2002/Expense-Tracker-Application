import { NotificationService } from '../services/notification.service';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface MarkAsReadCommand extends ICommand {
  notificationId: string;
  userId: string;
}

export class MarkAsReadHandler implements ICommandHandler<
  MarkAsReadCommand,
  CommandResult<NotificationDTO>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(input: MarkAsReadCommand): Promise<CommandResult<NotificationDTO>> {
    const dto = await this.notificationService.markAsRead(
      input.notificationId,
      input.userId
    );
    return CommandResult.success(dto);
  }
}
