import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { NotificationType } from "../enums/notification-type.enum";
import { NotificationChannel } from "../enums/notification-channel.enum";
import { NotificationPriority } from "../enums/notification-priority.enum";

/**
 * Emitted when a notification is created.
 */
export class NotificationCreatedEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly workspaceId: string,
    public readonly recipientId: string,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
    public readonly priority: NotificationPriority,
  ) {
    super(notificationId, "Notification");
  }

  get eventType(): string {
    return "notification.created";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      workspaceId: this.workspaceId,
      recipientId: this.recipientId,
      type: this.type,
      channel: this.channel,
      priority: this.priority,
    };
  }
}

/**
 * Emitted when a notification is successfully sent.
 */
export class NotificationSentEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly workspaceId: string,
    public readonly recipientId: string,
    public readonly channel: NotificationChannel,
    public readonly sentAt: Date,
  ) {
    super(notificationId, "Notification");
  }

  get eventType(): string {
    return "notification.sent";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      workspaceId: this.workspaceId,
      recipientId: this.recipientId,
      channel: this.channel,
      sentAt: this.sentAt.toISOString(),
    };
  }
}

/**
 * Emitted when a notification fails to send.
 */
export class NotificationFailedEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly workspaceId: string,
    public readonly recipientId: string,
    public readonly channel: NotificationChannel,
    public readonly error: string,
    public readonly failedAt: Date,
  ) {
    super(notificationId, "Notification");
  }

  get eventType(): string {
    return "notification.failed";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      workspaceId: this.workspaceId,
      recipientId: this.recipientId,
      channel: this.channel,
      error: this.error,
      failedAt: this.failedAt.toISOString(),
    };
  }
}

/**
 * Emitted when a notification is read by the recipient.
 */
export class NotificationReadEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly workspaceId: string,
    public readonly recipientId: string,
    public readonly readAt: Date,
  ) {
    super(notificationId, "Notification");
  }

  get eventType(): string {
    return "notification.read";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      workspaceId: this.workspaceId,
      recipientId: this.recipientId,
      readAt: this.readAt.toISOString(),
    };
  }
}
