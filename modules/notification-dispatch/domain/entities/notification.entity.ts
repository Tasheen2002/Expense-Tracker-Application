import { NotificationType } from "../enums/notification-type.enum";
import { NotificationChannel } from "../enums/notification-channel.enum";
import { NotificationPriority } from "../enums/notification-priority.enum";
import { NotificationStatus } from "../enums/notification-status.enum";
import { NotificationId } from "../value-objects/notification-id";
import { WorkspaceId } from "../value-objects";
import { UserId } from "../value-objects";

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

export class Notification {
  private props: NotificationProps;

  private constructor(props: NotificationProps) {
    this.props = props;
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
    return new Notification({
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
  }

  static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  getId(): NotificationId {
    return this.props.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getRecipientId(): UserId {
    return this.props.recipientId;
  }

  getType(): NotificationType {
    return this.props.type;
  }

  getChannel(): NotificationChannel {
    return this.props.channel;
  }

  getPriority(): NotificationPriority {
    return this.props.priority;
  }

  getTitle(): string {
    return this.props.title;
  }

  getContent(): string {
    return this.props.content;
  }

  getData(): Record<string, unknown> | undefined {
    return this.props.data;
  }

  getStatus(): NotificationStatus {
    return this.props.status;
  }

  getError(): string | undefined {
    return this.props.error;
  }

  getReadAt(): Date | undefined {
    return this.props.readAt;
  }

  getSentAt(): Date | undefined {
    return this.props.sentAt;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  isRead(): boolean {
    return !!this.props.readAt;
  }

  markAsSent(): void {
    this.props.status = NotificationStatus.SENT;
    this.props.sentAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsFailed(error: string): void {
    this.props.status = NotificationStatus.FAILED;
    this.props.error = error;
    this.props.updatedAt = new Date();
  }

  markAsRead(): void {
    if (this.props.readAt) return;
    this.props.readAt = new Date();
    this.props.status = NotificationStatus.READ;
    this.props.updatedAt = new Date();
  }
}
