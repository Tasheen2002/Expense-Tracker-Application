import { NotificationNotFoundError, UnauthorizedNotificationAccessError, NotificationRequestConflictError,
  NotificationConcurrencyError, InvalidNotificationDataError } from '../../domain/errors/notification.errors';
import {
  PrismaClient,
  Prisma,
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  NotificationStatus as PrismaNotificationStatus,
  Notification as PrismaNotification,
} from "../../../../prisma-client";
import { INotificationRepository, NotificationRequestIdentity } from "../../domain/repositories/notification.repository";
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
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

// Adapter metadata, deliberately absent from domain objects and public DTOs.
const revisions = new WeakMap<Notification, number>();

export class NotificationRepositoryImpl
  extends PrismaRepository<Notification>
  implements INotificationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  private persistenceData(notification: Notification) {
    return {
      workspaceId: notification.workspaceId.getValue(), recipientId: notification.recipientId.getValue(),
      type: notification.type as PrismaNotificationType, channel: notification.channel as PrismaNotificationChannel,
      priority: notification.priority as PrismaNotificationPriority, title: notification.title, content: notification.content,
      data: notification.data ? notification.data as Prisma.InputJsonValue : Prisma.JsonNull,
      status: notification.status as PrismaNotificationStatus, error: notification.error ?? null,
      readAt: notification.readAt ?? null, sentAt: notification.sentAt ?? null, updatedAt: notification.updatedAt,
    };
  }

  private async readRequest(client: Prisma.TransactionClient, request: NotificationRequestIdentity): Promise<Notification[] | null> {
    const receipt = await client.notificationRequest.findUnique({ where: { id: request.id } });
    if (!receipt) return null;
    if (receipt.kind !== 'COMMAND' || receipt.fingerprint !== request.fingerprint
      || receipt.workspaceId !== request.workspaceId || receipt.recipientId !== request.recipientId) {
      throw new NotificationRequestConflictError();
    }
    const rows = await client.notification.findMany({ where: { id: { in: receipt.notificationIds },
      workspaceId: request.workspaceId, recipientId: request.recipientId } });
    return receipt.notificationIds.flatMap(id => {
      const row = rows.find(item => item.id === id); return row ? [this.toDomain(row)] : [];
    });
  }

  async findRequest(request: NotificationRequestIdentity): Promise<Notification[] | null> {
    return this.readRequest(this.prisma, request);
  }

  async saveRequest(request: NotificationRequestIdentity, notifications: readonly Notification[]): Promise<Notification[]> {
    if (notifications.some(item => item.workspaceId.getValue() !== request.workspaceId || item.recipientId.getValue() !== request.recipientId)) {
      throw new InvalidNotificationDataError('request', 'channel records must belong to the request workspace and recipient');
    }
    const events = notifications.flatMap(item => item.domainEvents);
    const result = await this.prisma.$transaction(async tx => {
      // Transaction-scoped lock protects even the first receipt insertion.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${request.id}, 0))::text`;
      if (await tx.accountNotificationRequest.findUnique({ where: { id: request.id } })) throw new NotificationRequestConflictError();
      const previous = await this.readRequest(tx, request);
      if (previous !== null) return { notifications: previous, created: false };
      for (const notification of notifications) {
        await tx.notification.create({ data: { id: notification.id.getValue(),
          ...this.persistenceData(notification), createdAt: notification.createdAt } });
        if (notification.channel === NotificationChannel.EMAIL && notification.status === NotificationStatus.PENDING) {
          await tx.emailDelivery.create({ data: { notificationId: notification.id.getValue() } });
        }
      }
      await this.writeEvents(tx, events);
      await tx.notificationRequest.create({ data: { ...request, kind: 'COMMAND',
        notificationIds: notifications.map(item => item.id.getValue()) } });
      return { notifications: [...notifications], created: true };
    });
    if (result.created) {
      for (const notification of notifications) { revisions.set(notification, 0); notification.clearDomainEvents(); }
      await this.publishEvents(events);
    }
    return result.notifications;
  }

  private async writeEvents(tx: Prisma.TransactionClient, events: readonly import('@core/domain/events/domain-event').DomainEvent[]) {
    if (events.length) await tx.outboxEvent.createMany({ data: events.map(event => ({
      id: event.eventId, aggregateId: event.aggregateId, aggregateType: event.aggregateType,
      eventType: event.eventType, payload: event.getPayload() as Prisma.InputJsonObject,
      status: 'PENDING', createdAt: event.occurredAt,
    })) });
  }

  private async publishEvents(events: import('@core/domain/events/domain-event').DomainEvent[]) {
    try { await this.eventBus.publishAll(events); }
    catch (error: unknown) { console.error('[NotificationRepository] Post-commit event dispatch failed', error); }
  }

  async save(notification: Notification): Promise<void> { return this.saveBatch([notification]); }

  async saveBatch(notifications: readonly Notification[]): Promise<void> {
    const events = notifications.flatMap(notification => notification.domainEvents);
    await this.prisma.$transaction(async tx => {
      // Stable lock/write order avoids opposite-order batch deadlocks.
      for (const notification of [...notifications].sort((a, b) => a.id.getValue().localeCompare(b.id.getValue()))) {
        const id = notification.id.getValue(); const data = this.persistenceData(notification);
        const revision = revisions.get(notification);
        if (revision === undefined) {
          try { await tx.notification.create({ data: { id, ...data, createdAt: notification.createdAt } }); }
          catch (error: unknown) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new NotificationConcurrencyError();
            throw error;
          }
        } else {
          const updated = await tx.notification.updateMany({ where: { id, revision,
            workspaceId: data.workspaceId, recipientId: data.recipientId }, data: { ...data, revision: { increment: 1 } } });
          if (updated.count !== 1) throw new NotificationConcurrencyError();
        }
      }
      await this.writeEvents(tx, events);
    });
    for (const notification of notifications) {
      revisions.set(notification, revisions.has(notification) ? revisions.get(notification)! + 1 : 0);
      notification.clearDomainEvents();
    }
    await this.publishEvents(events);
  }

  async mutate(id: NotificationId, recipientId: UserId, workspaceId: WorkspaceId,
    mutation: (notification: Notification) => void): Promise<Notification> {
    const notification = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM notification_dispatch.notifications
        WHERE id = ${id.getValue()}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid FOR UPDATE`;
      const record = await tx.notification.findFirst({ where: { id: id.getValue(), workspaceId: workspaceId.getValue() } });
      if (!record) throw new NotificationNotFoundError(id.getValue());
      if (record.recipientId !== recipientId.getValue()) throw new UnauthorizedNotificationAccessError(id.getValue(), recipientId.getValue());
      const aggregate = this.toDomain(record);
      mutation(aggregate);
      if (aggregate.domainEvents.length) {
        await tx.notification.update({ where: { id: record.id }, data: { ...this.persistenceData(aggregate), revision: { increment: 1 } } });
        await this.writeEvents(tx, aggregate.domainEvents);
      }
      return aggregate;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    const events = notification.domainEvents;
    if (events.length) revisions.set(notification, revisions.get(notification)! + 1);
    notification.clearDomainEvents();
    await this.publishEvents(events);
    return notification;
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

    return this.findPage(where, options);
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

    return this.findPage(where, options);
  }

  private async findPage(where: Prisma.NotificationWhereInput, options?: PaginationOptions): Promise<PaginatedResult<Notification>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const page = await this.prisma.$transaction(async tx => {
      const records = await tx.notification.findMany({ where, take: limit, skip: offset,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      const total = await tx.notification.count({ where });
      return { records, total };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { items: page.records.map(record => this.toDomain(record)), total: page.total,
      limit, offset, hasMore: offset + page.records.length < page.total };
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
    const events = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM notification_dispatch.notifications
        WHERE recipient_id = ${recipientId.getValue()}::uuid
          AND workspace_id = ${workspaceId.getValue()}::uuid AND read_at IS NULL
        ORDER BY id FOR UPDATE
      `;
      if (!locked.length) return [];
      const records = await tx.notification.findMany({ where: { id: { in: locked.map(row => row.id) } } });
      const aggregates = records.map(record => this.toDomain(record));
      for (const aggregate of aggregates) aggregate.markAsRead();
      for (const aggregate of aggregates) {
        await tx.notification.update({ where: { id: aggregate.id.getValue() },
          data: { readAt: aggregate.readAt, status: PrismaNotificationStatus.READ, updatedAt: aggregate.updatedAt, revision: { increment: 1 } } });
      }
      const readEvents = aggregates.flatMap(aggregate => [...aggregate.domainEvents]);
      await tx.outboxEvent.createMany({ data: readEvents.map(event => ({
        id: event.eventId, aggregateId: event.aggregateId, aggregateType: event.aggregateType,
        eventType: event.eventType, payload: event.getPayload() as Prisma.InputJsonObject,
        status: 'PENDING', createdAt: event.occurredAt,
      })) });
      return readEvents;
    });
    try { await this.eventBus.publishAll(events); }
    catch (error: unknown) { console.error('[NotificationRepository] Post-commit event dispatch failed', error); }
  }

  toDomain(record: PrismaNotification): Notification {
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
      data: record.data === null ? undefined : record.data as Record<string, unknown>,
      status:
        NotificationStatus[record.status as keyof typeof NotificationStatus],
      error: record.error || undefined,
      readAt: record.readAt || undefined,
      sentAt: record.sentAt || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    const notification = Notification.fromPersistence(props);
    revisions.set(notification, record.revision);
    return notification;
  }
}
