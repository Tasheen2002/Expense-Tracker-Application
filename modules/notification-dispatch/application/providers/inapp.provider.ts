import { IChannelProvider, SendResult } from "./channel-provider.interface";
import { INotificationRepository } from "../../domain/repositories/notification.repository";
import { Notification } from "../../domain/entities/notification.entity";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";
import { NotificationPriority } from "../../domain/enums/notification-priority.enum";
import { UserId, WorkspaceId } from "../../domain/value-objects";

export class InAppProvider implements IChannelProvider {
  constructor(
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async send(params: {
    recipientId: string;
    recipientEmail?: string;
    subject: string;
    content: string;
    data?: Record<string, unknown>;
    workspaceId?: string;
    type?: NotificationType;
    priority?: NotificationPriority;
  }): Promise<SendResult> {
    try {
      if (!params.workspaceId) {
        return {
          success: false,
          error: "Workspace ID is required for in-app notifications",
        };
      }

      const notification = Notification.create({
        workspaceId: WorkspaceId.fromString(params.workspaceId),
        recipientId: UserId.fromString(params.recipientId),
        type: params.type || NotificationType.SYSTEM_ALERT,
        channel: NotificationChannel.IN_APP,
        priority: params.priority || NotificationPriority.MEDIUM,
        title: params.subject,
        content: params.content,
        data: params.data,
      });

      notification.markAsSent();
      await this.notificationRepository.save(notification);

      return {
        success: true,
        messageId: notification.getId().getValue(),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save in-app notification",
      };
    }
  }
}
