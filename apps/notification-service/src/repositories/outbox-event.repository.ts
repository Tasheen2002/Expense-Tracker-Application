import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma, type OutboxEvent } from '../prisma-client';
import type { IOutboxEventRepository, OutboxEventDTO, OutboxEventStatus } from '@expense-tracker/outbox-kit';
import { databaseTime } from '../shared/infrastructure/persistence/database-time';

function validateLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid outbox batch limit');
}
function validateRetries(retries: number): void {
  if (!Number.isInteger(retries) || retries < 0 || retries > 2147483647) throw new Error('Invalid outbox retry limit');
}
function validateDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 86400000) throw new Error('Invalid outbox lease duration');
}
export class PrismaOutboxEventRepository implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPending(limit: number): Promise<OutboxEventDTO[]> {
    validateLimit(limit); const now = await databaseTime(this.prisma);
    return (await this.prisma.outboxEvent.findMany({ where: { status: 'PENDING', nextAttemptAt: { lte: now } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: limit })).map(toDTO);
  }
  async findFailed(limit: number, maxRetries: number): Promise<OutboxEventDTO[]> {
    validateLimit(limit); validateRetries(maxRetries); const now = await databaseTime(this.prisma);
    return (await this.prisma.outboxEvent.findMany({ where: { status: 'FAILED', retryCount: { lt: maxRetries }, nextAttemptAt: { lte: now } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: limit })).map(toDTO);
  }
  claimPending(limit: number, leaseDurationMs = 60000): Promise<OutboxEventDTO[]> {
    return this.claim('PENDING', limit, leaseDurationMs);
  }
  claimFailed(limit: number, maxRetries: number, leaseDurationMs = 60000): Promise<OutboxEventDTO[]> {
    validateRetries(maxRetries); return this.claim('FAILED', limit, leaseDurationMs, maxRetries);
  }
  private async claim(status: 'PENDING' | 'FAILED', limit: number, duration: number, maxRetries = 2147483647): Promise<OutboxEventDTO[]> {
    validateLimit(limit); validateDuration(duration);
    return this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM notification_dispatch.outbox_event
        WHERE status = ${status}::notification_dispatch."OutboxEventStatus"
          AND next_attempt_at <= (clock_timestamp() AT TIME ZONE 'UTC')
          AND (${status} = 'PENDING' OR retry_count < ${maxRetries})
        ORDER BY created_at, id LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
      if (!rows.length) return [];
      const now = await databaseTime(tx); const token = randomUUID(); const ids = rows.map(row => row.id);
      await tx.outboxEvent.updateMany({ where: { id: { in: ids }, status }, data: {
        status: 'PROCESSING', leaseToken: token, leaseExpiresAt: new Date(now.getTime() + duration) } });
      return (await tx.outboxEvent.findMany({ where: { id: { in: ids }, leaseToken: token },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(toDTO);
    });
  }
  async releaseExpiredLeases(): Promise<number> {
    return this.prisma.$executeRaw`UPDATE notification_dispatch.outbox_event
      SET status = 'PENDING', lease_token = NULL, lease_expires_at = NULL
      WHERE status = 'PROCESSING' AND (lease_expires_at IS NULL
        OR lease_expires_at <= (clock_timestamp() AT TIME ZONE 'UTC'))`;
  }
  private async withOwner(id: string, token: string | null | undefined,
    action: (tx: Prisma.TransactionClient, event: OutboxEvent, now: Date) => Promise<boolean>): Promise<boolean> {
    if (!token) return false;
    return this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM notification_dispatch.outbox_event
        WHERE id = ${id} AND lease_token = ${token} AND status = 'PROCESSING' FOR UPDATE`;
      if (!rows.length) return false;
      const event = await tx.outboxEvent.findUniqueOrThrow({ where: { id } }); const now = await databaseTime(tx);
      if (!event.leaseExpiresAt || event.leaseExpiresAt <= now) return false;
      return action(tx, event, now);
    });
  }
  async updateStatus(id: string, status: OutboxEventStatus, error?: string | null, token?: string | null): Promise<boolean> {
    return this.withOwner(id, token, async (tx, _event, now) => {
      const terminal = status !== 'PROCESSING';
      await tx.outboxEvent.update({ where: { id }, data: { status, error: error ?? null,
        processedAt: status === 'PROCESSED' ? now : null, leaseToken: terminal ? null : undefined,
        leaseExpiresAt: terminal ? null : undefined } }); return true;
    });
  }
  async markDelivered(id: string, subscriberUrl: string, token?: string | null): Promise<boolean> {
    return this.withOwner(id, token, async (tx, event) => {
      if (!event.deliveredTo.includes(subscriberUrl)) await tx.outboxEvent.update({ where: { id },
        data: { deliveredTo: { push: subscriberUrl } } }); return true;
    });
  }
  async incrementRetry(id: string, error: string, token?: string | null): Promise<boolean> {
    return this.withOwner(id, token, async (tx, event, now) => {
      const backoff = Math.min(1000 * 2 ** Math.min(event.retryCount + 1, 20), 300000);
      await tx.outboxEvent.update({ where: { id }, data: { retryCount: { increment: 1 }, status: 'FAILED', error,
        nextAttemptAt: new Date(now.getTime() + backoff), leaseToken: null, leaseExpiresAt: null } }); return true;
    });
  }
  async renewLease(id: string, token: string, duration: number): Promise<boolean> {
    validateDuration(duration);
    return this.withOwner(id, token, async (tx, _event, now) => {
      await tx.outboxEvent.update({ where: { id }, data: { leaseExpiresAt: new Date(now.getTime() + duration) } }); return true;
    });
  }
  async deleteProcessedBefore(days: number): Promise<number> {
    if (!Number.isInteger(days) || days < 0 || days > 36500) throw new Error('Invalid outbox retention period');
    const now = await databaseTime(this.prisma); const cutoff = new Date(now.getTime() - days * 86400000);
    return (await this.prisma.outboxEvent.deleteMany({ where: { status: 'PROCESSED', processedAt: { lt: cutoff } } })).count;
  }
  async save(event: { aggregateType: string; aggregateId: string; eventType: string; payload: Record<string, unknown> }): Promise<void> {
    await this.prisma.outboxEvent.create({ data: { id: randomUUID(), ...event, payload: event.payload as Prisma.InputJsonObject, status: 'PENDING' } });
  }
}
function toDTO(event: OutboxEvent): OutboxEventDTO {
  return { id: event.id, aggregateType: event.aggregateType, aggregateId: event.aggregateId, eventType: event.eventType,
    payload: event.payload as Record<string, unknown>, status: event.status, createdAt: event.createdAt.toISOString(),
    processedAt: event.processedAt?.toISOString() ?? null, retryCount: event.retryCount, error: event.error,
    deliveredTo: event.deliveredTo, leaseToken: event.leaseToken, leaseExpiresAt: event.leaseExpiresAt?.toISOString() ?? null,
    nextAttemptAt: event.nextAttemptAt.toISOString() };
}
export default PrismaOutboxEventRepository;