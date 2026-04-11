import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationId } from '../value-objects/notification-id';
import { WorkspaceId } from '../value-objects';
import { UserId } from '../value-objects';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

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
    public readonly priority: NotificationPriority
  ) {
    super(notificationId, 'Notification');
  }

  get eventType(): string {
    return 'notification.created';
  }

  getPayload(): Record<string, unknown> {
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
    public readonly sentAt: Date
  ) {
    super(notificationId, 'Notification');
  }

  get eventType(): string {
    return 'notification.sent';
  }

  getPayload(): Record<string, unknown> {
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
    public readonly failedAt: Date
  ) {
    super(notificationId, 'Notification');
  }

  get eventType(): string {
    return 'notification.failed';
  }

  getPayload(): Record<string, unknown> {
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
    public readonly readAt: Date
  ) {
    super(notificationId, 'Notification');
  }

  get eventType(): string {
    return 'notification.read';
  }

  getPayload(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      workspaceId: this.workspaceId,
      recipientId: this.recipientId,
      readAt: this.readAt.toISOString(),
    };
  }
}

export interface NotificationProps {
  id: NotificationId;
  workspaceId: WorkspaceId;
  recipientId: UserId;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  error?: string;
  readAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Notification extends AggregateRoot {
  private constructor(private props: NotificationProps) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    recipientId: UserId;
    type: NotificationType;
    channel: NotificationChannel;
    priority?: NotificationPriority;
    title: string;
    content: string;
    data?: Record<string, unknown>;
  }): Notification {
    const notification = new Notification({
      id: NotificationId.create(),
      workspaceId: params.workspaceId,
      recipientId: params.recipientId,
      type: params.type,
      channel: params.channel,
      priority: params.priority || NotificationPriority.MEDIUM,
      title: params.title,
      content: params.content,
      data: params.data,
      status: NotificationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    notification.addDomainEvent(
      new NotificationCreatedEvent(
        notification.id.getValue(),
        notification.workspaceId.getValue(),
        notification.recipientId.getValue(),
        notification.type,
        notification.channel,
        notification.priority
      )
    );

    return notification;
  }

  static fromPersistence(props: NotificationProps): Notification {
    return new Notification(props);
  }

  get id(): NotificationId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get recipientId(): UserId { return this.props.recipientId; }
  get type(): NotificationType { return this.props.type; }
  get channel(): NotificationChannel { return this.props.channel; }
  get priority(): NotificationPriority { return this.props.priority; }
  get title(): string { return this.props.title; }
  get content(): string { return this.props.content; }
  get data(): Record<string, unknown> | undefined { return this.props.data; }
  get status(): NotificationStatus { return this.props.status; }
  get error(): string | undefined { return this.props.error; }
  get readAt(): Date | undefined { return this.props.readAt; }
  get sentAt(): Date | undefined { return this.props.sentAt; }
  get createdAt(): Date { return this.props.createdAt; }

  isRead(): boolean {
    return !!this.props.readAt;
  }

  markAsSent(): void {
    this.props.status = NotificationStatus.SENT;
    this.props.sentAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new NotificationSentEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        this.props.recipientId.getValue(),
        this.props.channel,
        this.props.sentAt
      )
    );
  }

  markAsFailed(error: string): void {
    this.props.status = NotificationStatus.FAILED;
    this.props.error = error;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new NotificationFailedEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        this.props.recipientId.getValue(),
        this.props.channel,
        error,
        this.props.updatedAt
      )
    );
  }

  markAsRead(): void {
    if (this.props.readAt) return;
    this.props.readAt = new Date();
    this.props.status = NotificationStatus.READ;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new NotificationReadEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        this.props.recipientId.getValue(),
        this.props.readAt
      )
    );
  }

  static toDTO(notification: Notification): NotificationDTO {
    return {
      id: notification.id.getValue(),
      type: notification.type,
      channel: notification.channel,
      priority: notification.priority,
      title: notification.title,
      content: notification.content,
      data: notification.data,
      status: notification.status,
      isRead: notification.isRead(),
      readAt: notification.readAt?.toISOString() || null,
      sentAt: notification.sentAt?.toISOString() || null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  isRead: boolean;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}
