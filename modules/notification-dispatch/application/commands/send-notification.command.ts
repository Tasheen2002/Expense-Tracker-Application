import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationPriority } from '../../domain/enums/notification-priority.enum';
import { NotificationService } from '../services/notification.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface SendNotificationCommand extends ICommand {
  workspaceId: string;
  recipientId: string;
  type: NotificationType;
  data: Record<string, unknown>;
  priority?: NotificationPriority;
}

export class SendNotificationHandler implements ICommandHandler<
  SendNotificationCommand,
  CommandResult<{ notificationIds: string[] }>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(
    input: SendNotificationCommand
  ): Promise<CommandResult<{ notificationIds: string[] }>> {
    try {
      const notifications = await this.notificationService.send({
        workspaceId: input.workspaceId,
        recipientId: input.recipientId,
        type: input.type,
        data: input.data,
        priority: input.priority,
      });
      return CommandResult.success({
        notificationIds: notifications.map((n) => n.getId().getValue()),
      });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
