import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationPriority } from '../../domain/enums/notification-priority.enum';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import { NotificationService } from '../services/notification.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface SendNotificationCommand extends ICommand {
  workspaceId: string;
  recipientId: string;
  type: NotificationType;
  data: Record<string, unknown>;
  priority?: NotificationPriority;
}

export class SendNotificationHandler implements ICommandHandler<
  SendNotificationCommand,
  CommandResult<NotificationDTO[]>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(
    input: SendNotificationCommand
  ): Promise<CommandResult<NotificationDTO[]>> {
    const dtos = await this.notificationService.send({
      workspaceId: input.workspaceId,
      recipientId: input.recipientId,
      type: input.type,
      data: input.data,
      priority: input.priority,
    });
    return CommandResult.success(dtos);
  }
}
