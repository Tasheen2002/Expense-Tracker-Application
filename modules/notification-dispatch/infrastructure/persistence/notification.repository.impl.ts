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
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class NotificationRepositoryImpl
  extends PrismaRepository<Notification>
  implements INotificationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(notification: Notification): Promise<void> {
    const id = notification.getId().getValue();
    const notificationData = notification.getData();

    const data = {
      workspaceId: notification.getWorkspaceId().getValue(),
      recipientId: notification.getRecipientId().getValue(),
      type: notification.getType() as unknown as PrismaNotificationType,
      channel:
        notification.getChannel() as unknown as PrismaNotificationChannel,
      priority:
        notification.getPriority() as unknown as PrismaNotificationPriority,
      title: notification.getTitle(),
      content: notification.getContent(),
      data: notificationData
        ? (notificationData as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      status: notification.getStatus() as unknown as PrismaNotificationStatus,
      error: notification.getError() || null,
      readAt: notification.getReadAt() || null,
      sentAt: notification.getSentAt() || null,
    };

    await this.prisma.notification.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });

    await this.dispatchEvents(notification);
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Notification>> {
    const where = {
      recipientId: recipientId.getValue(),
      workspaceId: workspaceId.getValue(),
      readAt: null,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.notification,
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      options,
    );
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

    return PrismaRepositoryHelper.paginate(
      this.prisma.notification,
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      options,
    );
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
