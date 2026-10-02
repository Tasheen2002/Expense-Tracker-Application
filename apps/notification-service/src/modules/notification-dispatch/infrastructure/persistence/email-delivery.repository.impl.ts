import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../../../../prisma-client';
import { IEventBus } from '@core/domain/events/domain-event';
import { DeliveryClaim, DeliveryMessage, IEmailDeliveryRepository } from '../../application/ports/email-delivery.repository';
import { NotificationRepositoryImpl } from './notification.repository.impl';
import { databaseTime } from '../../../../shared/infrastructure/persistence/database-time';
import { z } from 'zod';

const messageSchema = z.object({ idempotencyKey: z.string().uuid(), recipientId: z.string().uuid(),
  recipientEmail: z.string().email(), senderEmail: z.string().min(1), subject: z.string().min(1), content: z.string().min(1) }).strict();

export class EmailDeliveryRepositoryImpl implements IEmailDeliveryRepository {
  private readonly notifications: NotificationRepositoryImpl;
  constructor(private readonly prisma: PrismaClient, private readonly eventBus: IEventBus) {
    this.notifications = new NotificationRepositoryImpl(prisma, eventBus);
  }

  async claim(limit: number): Promise<DeliveryClaim[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid delivery batch size');
    const token = randomUUID();
    return this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ notification_id: string }[]>`
        SELECT notification_id FROM notification_dispatch.email_deliveries
        WHERE (status = 'PENDING' AND next_attempt_at <= clock_timestamp())
           OR (status = 'PROCESSING' AND lease_expires_at <= clock_timestamp())
        ORDER BY next_attempt_at, notification_id FOR UPDATE SKIP LOCKED LIMIT ${limit}`;
      const now = await databaseTime(tx);
      await tx.emailDelivery.updateMany({ where: { notificationId: { in: rows.map(row => row.notification_id) } },
        data: { status: 'PROCESSING', leaseToken: token, leaseExpiresAt: new Date(now.getTime() + 60000), attempts: { increment: 1 } } });
      return rows.map(row => ({ notificationId: row.notification_id, leaseToken: token }));
    });
  }

  private async lock(tx: Prisma.TransactionClient, claim: DeliveryClaim) {
    const rows = await tx.$queryRaw<{ notification_id: string }[]>`
      SELECT notification_id FROM notification_dispatch.email_deliveries
      WHERE notification_id = ${claim.notificationId}::uuid AND lease_token = ${claim.leaseToken}::uuid
        AND status = 'PROCESSING' FOR UPDATE`;
    if (!rows.length) return null;
    const job = await tx.emailDelivery.findUniqueOrThrow({ where: { notificationId: claim.notificationId } });
    const now = await databaseTime(tx);
    return job.leaseExpiresAt && job.leaseExpiresAt > now ? { job, now } : null;
  }

  async load(claim: DeliveryClaim) {
    const now = await databaseTime(this.prisma);
    const job = await this.prisma.emailDelivery.findFirst({ where: { notificationId: claim.notificationId,
      leaseToken: claim.leaseToken, status: 'PROCESSING', leaseExpiresAt: { gt: now } }, include: { notification: true } });
    const parsed = messageSchema.safeParse(job?.message);
    return job ? { notification: this.notifications.toDomain(job.notification),
      message: parsed.success ? parsed.data : null } : null;
  }

  async prepare(claim: DeliveryClaim, message: DeliveryMessage, provider: string, retrySafe = true): Promise<DeliveryMessage | null> {
    return this.prisma.$transaction(async tx => {
      const ownership = await this.lock(tx, claim); if (!ownership) return null;
      const { job, now } = ownership;
      const parsed = messageSchema.safeParse(job.message ?? message);
      const notification = await tx.notification.findUniqueOrThrow({ where: { id: claim.notificationId }, select: { recipientId: true, channel: true } });
      if ((!retrySafe && job.message !== null) || job.attempts > 10 || (job.retryDeadline && job.retryDeadline.getTime() <= now.getTime() + 60000)
        || (job.provider && job.provider !== provider) || notification.channel !== 'EMAIL'
        || !parsed.success || parsed.data.idempotencyKey !== claim.notificationId
        || parsed.data.recipientId !== notification.recipientId
        || (job.message !== null && (!job.retryDeadline || !job.firstAttemptAt || !job.provider))) {
        await tx.emailDelivery.update({ where: { notificationId: claim.notificationId }, data: {
          status: 'RECONCILIATION_REQUIRED', leaseToken: null, leaseExpiresAt: null,
          error: 'Unsafe retry window, attempt budget, provider or message identity; reconcile before retrying' } });
        return null;
      }
      if (job.message) return parsed.data;
      await tx.emailDelivery.update({ where: { notificationId: claim.notificationId }, data: {
        message: { ...parsed.data }, provider, firstAttemptAt: now, retryDeadline: new Date(now.getTime() + 23 * 3600000) } });
      return parsed.data;
    });
  }

  async complete(claim: DeliveryClaim, success: boolean, error = 'Email delivery failed'): Promise<boolean> {
    const result = await this.prisma.$transaction(async tx => {
      if (!await this.lock(tx, claim)) return null;
      await tx.$queryRaw`SELECT id FROM notification_dispatch.notifications WHERE id = ${claim.notificationId}::uuid FOR UPDATE`;
      // Waiting for a concurrent read mutation may outlast the lease.
      if (!await this.lock(tx, claim)) return null;
      const record = await tx.notification.findUniqueOrThrow({ where: { id: claim.notificationId } });
      const notification = this.notifications.toDomain(record);
      if (success) notification.recordDeliverySuccess(); else notification.recordDeliveryFailure(error);
      await tx.notification.update({ where: { id: record.id }, data: { status: notification.status,
        sentAt: notification.sentAt ?? null, error: notification.error ?? null, updatedAt: notification.updatedAt, revision: { increment: 1 } } });
      const events = notification.domainEvents;
      if (events.length) await tx.outboxEvent.createMany({ data: events.map(event => ({ id: event.eventId,
        aggregateId: event.aggregateId, aggregateType: event.aggregateType, eventType: event.eventType,
        payload: event.getPayload() as Prisma.InputJsonObject, status: 'PENDING', createdAt: event.occurredAt })) });
      await tx.emailDelivery.update({ where: { notificationId: claim.notificationId }, data: {
        status: success ? 'DELIVERED' : 'FAILED', error: success ? null : error, leaseToken: null, leaseExpiresAt: null } });
      return events;
    });
    if (result === null) return false;
    try { await this.eventBus.publishAll(result); } catch { /* Durable outbox remains authoritative. */ }
    return true;
  }

  async retry(claim: DeliveryClaim, error: string): Promise<boolean> {
    return this.prisma.$transaction(async tx => {
      const ownership = await this.lock(tx, claim); if (!ownership) return false;
      const { job, now } = ownership;
      const reconcile = job.attempts >= 10 || (job.retryDeadline !== null && job.retryDeadline.getTime() <= now.getTime() + 60000);
      await tx.emailDelivery.update({ where: { notificationId: claim.notificationId }, data: {
        status: reconcile ? 'RECONCILIATION_REQUIRED' : 'PENDING', leaseToken: null, leaseExpiresAt: null,
        nextAttemptAt: new Date(now.getTime() + Math.min(300000, 1000 * 2 ** Math.min(job.attempts, 8))), error } });
      return true;
    });
  }
}
