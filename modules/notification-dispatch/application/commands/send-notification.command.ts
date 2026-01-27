import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationPriority } from "../../domain/enums/notification-priority.enum";
import { NotificationService } from "../services/notification.service";

export class SendNotificationCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly recipientId: string,
    public readonly type: NotificationType,
    public readonly data: Record<string, unknown>,
    public readonly priority?: NotificationPriority,
  ) {}
}

export class SendNotificationHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(command: SendNotificationCommand) {
    return await this.notificationService.send({
      workspaceId: command.workspaceId,
      recipientId: command.recipientId,
      type: command.type,
      data: command.data,
      priority: command.priority,
    });
  }
}
