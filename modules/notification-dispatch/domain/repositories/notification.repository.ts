import { Notification } from "../entities/notification.entity";
import { NotificationId } from "../value-objects/notification-id";
import { UserId, WorkspaceId } from "../value-objects";

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: NotificationId): Promise<Notification | null>;
  findUnreadByRecipient(
    recipientId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<Notification[]>;
  findByRecipient(
    recipientId: UserId,
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<Notification[]>;
  countUnread(recipientId: UserId, workspaceId: WorkspaceId): Promise<number>;
  markAllAsRead(recipientId: UserId, workspaceId: WorkspaceId): Promise<void>;
}
