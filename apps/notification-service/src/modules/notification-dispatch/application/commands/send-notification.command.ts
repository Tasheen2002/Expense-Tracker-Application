import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationPriority } from '../../domain/enums/notification-priority.enum';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import { NotificationService } from '../services/notification.service';
import { NotificationId } from '../../domain/value-objects/notification-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

/** Trusted internal command. Success means the request was processed;
 * inspect each returned channel status to determine delivery success. */
export interface SendNotificationCommand extends ICommand {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly recipientId: string;
  readonly type: NotificationType;
  readonly data: Record<string, unknown>;
  readonly priority?: NotificationPriority;
  readonly title?: string;
  readonly content?: string;
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
      requestId: NotificationId.fromString(input.requestId).getValue(),
      workspaceId: input.workspaceId,
      recipientId: input.recipientId,
      type: input.type,
      data: input.data,
      priority: input.priority,
      title: input.title,
      content: input.content,
    });
    return CommandResult.success(dtos);
  }
}
