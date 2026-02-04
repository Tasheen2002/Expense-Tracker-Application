import {
  PrismaClient,
  Prisma,
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  NotificationStatus as PrismaNotificationStatus,
  Notification as PrismaNotification,
} from "@prisma/client";
import { INotificationRepository } from "../../domain/repositories/notification.repository";
import {
  Notification,
  NotificationProps,
} from "../../domain/entities/notification.entity";
import { NotificationId } from "../../domain/value-objects/notification-id";
import { UserId, WorkspaceId } from "../../domain/value-objects";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";
import { NotificationPriority } from "../../domain/enums/notification-priority.enum";
import { NotificationStatus } from "../../domain/enums/notification-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class NotificationRepositoryImpl implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(notification: Notification): Promise<void> {
    const id = notification.getId().getValue();
    const notificationData = notification.getData();

    const data = {
      workspaceId: notification.getWorkspaceId().getValue(),
      recipientId: notification.getRecipientId().getValue(),
      type: PrismaNotificationType[notification.getType()],
      channel: PrismaNotificationChannel[notification.getChannel()],
      priority: PrismaNotificationPriority[notification.getPriority()],
      title: notification.getTitle(),
      content: notification.getContent(),
      data: notificationData
        ? (notificationData as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      status: PrismaNotificationStatus[notification.getStatus()],
      error: notification.getError() || null,
      readAt: notification.getReadAt() || null,
      sentAt: notification.getSentAt() || null,
    };

    await this.prisma.notification.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  async findById(id: NotificationId): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({
      where: { id: id.getValue() },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findUnreadByRecipient(
    recipientId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        recipientId: recipientId.getValue(),
        workspaceId: workspaceId.getValue(),
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByRecipient(
    recipientId: UserId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Notification>> {
    const where = {
      recipientId: recipientId.getValue(),
      workspaceId: workspaceId.getValue(),
    };
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [records, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      limit,
      offset,
      hasMore: offset + records.length < total,
    };
  }

  async countUnread(
    recipientId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        recipientId: recipientId.getValue(),
        workspaceId: workspaceId.getValue(),
        readAt: null,
      },
    });
  }

  async markAllAsRead(
    recipientId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        recipientId: recipientId.getValue(),
        workspaceId: workspaceId.getValue(),
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: PrismaNotificationStatus.READ,
      },
    });
  }

  private toDomain(record: PrismaNotification): Notification {
    const props: NotificationProps = {
      id: NotificationId.fromString(record.id),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      recipientId: UserId.fromString(record.recipientId),
      type: NotificationType[record.type as keyof typeof NotificationType],
      channel:
        NotificationChannel[record.channel as keyof typeof NotificationChannel],
      priority:
        NotificationPriority[
          record.priority as keyof typeof NotificationPriority
        ],
      title: record.title,
      content: record.content,
      data: record.data as Record<string, unknown> | undefined,
      status:
        NotificationStatus[record.status as keyof typeof NotificationStatus],
      error: record.error || undefined,
      readAt: record.readAt || undefined,
      sentAt: record.sentAt || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    return Notification.reconstitute(props);
  }
}
