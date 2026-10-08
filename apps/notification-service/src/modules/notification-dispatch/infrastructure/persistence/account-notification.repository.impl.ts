import { PrismaClient, Prisma } from '../../../../prisma-client';
import { randomUUID } from 'node:crypto';
import {
  AccountNotification,
  AccountNotificationSettings,
  validateAccountNotificationSettings,
} from '../../domain/entities/account-notification.entity';
import { IAccountNotificationRepository } from '../../domain/repositories/account-notification.repository';
import {
  NotificationNotFoundError,
  NotificationRequestConflictError,
} from '../../domain/errors/notification.errors';

export class AccountNotificationRepositoryImpl implements IAccountNotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async accept(notification: AccountNotification, fingerprint: string) {
    const data = notification.snapshot();
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.id}, 0))::text`;
      if (
        (await tx.notificationRequest.findUnique({ where: { id: data.id } })) ||
        (await tx.notification.findUnique({ where: { id: data.id } }))
      )
        throw new NotificationRequestConflictError();
      const existing = await tx.accountNotificationRequest.findUnique({
        where: { id: data.id },
      });
      if (existing) {
        if (
          existing.userId !== data.userId ||
          existing.fingerprint !== fingerprint
        )
          throw new NotificationRequestConflictError();
        return { duplicate: true, suppressed: existing.suppressed };
      }
      const preference = await tx.accountNotificationPreference.findUnique({
        where: { userId: data.userId },
      });
      const settings = preference
        ? validateAccountNotificationSettings({
            inAppEnabled: preference.inAppEnabled,
            typeSettings: preference.typeSettings as Record<string, boolean>,
          })
        : { inAppEnabled: true, typeSettings: {} as Record<string, boolean> };
      const suppressed =
        !settings.inAppEnabled ||
        settings.typeSettings[data.eventType] === false;
      await tx.accountNotificationRequest.create({
        data: { id: data.id, userId: data.userId, fingerprint, suppressed },
      });
      if (!suppressed) {
        await tx.accountNotification.create({ data });
        await tx.outboxEvent.create({
          data: {
            id: randomUUID(),
            aggregateId: data.id,
            aggregateType: 'AccountNotification',
            eventType: 'account.notification.created',
            status: 'PENDING',
            payload: {
              scope: 'account',
              accountId: data.userId,
              userId: data.userId,
              notificationId: data.id,
            },
          },
        });
      }
      return { duplicate: false, suppressed };
    });
  }
  async list(userId: string, limit: number, offset: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.accountNotification.findMany({
          where: { userId },
          take: limit,
          skip: offset,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        const total = await tx.accountNotification.count({ where: { userId } });
        return {
          items: rows.map((row) => AccountNotification.reconstitute(row)),
          total,
          limit,
          offset,
          hasMore: offset + rows.length < total,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );
  }
  async markRead(userId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM notification_dispatch.account_notifications
        WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      const row = await tx.accountNotification.findFirst({
        where: { id, userId },
      });
      if (!row) throw new NotificationNotFoundError(id);
      const notification = AccountNotification.reconstitute(row);
      if (!notification.markRead()) return;
      await tx.accountNotification.update({
        where: { id },
        data: { readAt: notification.snapshot().readAt },
      });
      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          aggregateId: id,
          aggregateType: 'AccountNotification',
          eventType: 'account.notification.read',
          status: 'PENDING',
          payload: {
            scope: 'account',
            accountId: userId,
            userId,
            notificationId: id,
          },
        },
      });
    });
  }
  async getPreferences(userId: string): Promise<AccountNotificationSettings> {
    const row = await this.prisma.accountNotificationPreference.findUnique({
      where: { userId },
    });
    return row
      ? validateAccountNotificationSettings({
          inAppEnabled: row.inAppEnabled,
          typeSettings: row.typeSettings as Record<string, boolean>,
        })
      : { inAppEnabled: true, typeSettings: {} };
  }
  async setPreferences(userId: string, settings: AccountNotificationSettings) {
    const data = validateAccountNotificationSettings(settings);
    await this.prisma.accountNotificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
