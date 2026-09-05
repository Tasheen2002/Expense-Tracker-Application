import { Prisma, PrismaClient, OutboxEvent } from '@prisma/client';
import { IOutboxEventRepository, OutboxEventDTO, OutboxEventStatus } from '@expense-tracker/outbox-kit';
import { v4 as uuidv4 } from 'uuid';

export class PrismaOutboxEventRepository implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPending(limit: number): Promise<OutboxEventDTO[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return events.map((e) => this.toDTO(e));
  }

  async findFailed(limit: number, maxRetries: number): Promise<OutboxEventDTO[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: maxRetries },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return events.map((e) => this.toDTO(e));
  }

  async claimPending(limit: number, leaseDurationMs = 60_000): Promise<OutboxEventDTO[]> {
    return this.prisma.$transaction(async (tx) => {
      // PostgreSQL FOR UPDATE SKIP LOCKED guarantees parallel workers claim disjoint rows without contention or blocking.
      // Unconditional raw query with immediate failure propagation on database error.
      const rawCandidates = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM identity_workspace.outbox_event
        WHERE status = 'PENDING'::identity_workspace."OutboxEventStatus"
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      const ids = rawCandidates.map((c) => c.id);

      if (ids.length === 0) {
        return [];
      }

      const leaseToken = uuidv4();
      const leaseExpiresAt = new Date(Date.now() + leaseDurationMs);

      await tx.outboxEvent.updateMany({
        where: {
          id: { in: ids },
          status: 'PENDING',
        },
        data: {
          status: 'PROCESSING',
          leaseToken,
          leaseExpiresAt,
        },
      });

      const claimed = await tx.outboxEvent.findMany({
        where: {
          id: { in: ids },
          leaseToken,
        },
        orderBy: { createdAt: 'asc' },
      });

      return claimed.map((e) => this.toDTO(e));
    });
  }

  async claimFailed(limit: number, maxRetries: number, leaseDurationMs = 60_000): Promise<OutboxEventDTO[]> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      const rawCandidates = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM identity_workspace.outbox_event
        WHERE status = 'FAILED'::identity_workspace."OutboxEventStatus"
          AND retry_count < ${maxRetries}
          AND next_attempt_at <= ${now}
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      const ids = rawCandidates.map((c) => c.id);

      if (ids.length === 0) {
        return [];
      }

      const leaseToken = uuidv4();
      const leaseExpiresAt = new Date(Date.now() + leaseDurationMs);

      await tx.outboxEvent.updateMany({
        where: {
          id: { in: ids },
          status: 'FAILED',
        },
        data: {
          status: 'PROCESSING',
          leaseToken,
          leaseExpiresAt,
        },
      });

      const claimed = await tx.outboxEvent.findMany({
        where: {
          id: { in: ids },
          leaseToken,
        },
        orderBy: { createdAt: 'asc' },
      });

      return claimed.map((e) => this.toDTO(e));
    });
  }

  async releaseExpiredLeases(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        status: 'PROCESSING',
        leaseExpiresAt: { lt: now },
      },
      data: {
        status: 'PENDING',
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    return result.count;
  }

  async markDelivered(id: string, subscriberUrl: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        deliveredTo: { push: subscriberUrl },
      },
    });
  }

  async updateStatus(id: string, status: OutboxEventStatus, error?: string | null): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status,
        processedAt: status === 'PROCESSED' ? new Date() : null,
        leaseToken: status === 'PROCESSED' || status === 'DEAD_LETTER' ? null : undefined,
        leaseExpiresAt: status === 'PROCESSED' || status === 'DEAD_LETTER' ? null : undefined,
        error: error || null,
      },
    });
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id },
      select: { retryCount: true },
    });

    const newRetryCount = (event?.retryCount ?? 0) + 1;
    // Exponential backoff: 2s, 4s, 8s, 16s, up to 5 minutes
    const backoffMs = Math.min(1000 * Math.pow(2, newRetryCount), 300_000);
    const nextAttemptAt = new Date(Date.now() + backoffMs);

    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        error,
        status: 'FAILED',
        leaseToken: null,
        leaseExpiresAt: null,
        nextAttemptAt,
      },
    });
  }

  async deleteProcessedBefore(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: 'PROCESSED',
        createdAt: { lt: cutoff },
      },
    });
    return result.count;
  }

  async save(event: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as Prisma.InputJsonObject,
        status: 'PENDING',
      },
    });
  }

  private toDTO(event: OutboxEvent): OutboxEventDTO {
    return {
      id: event.id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload as Record<string, unknown>,
      status: event.status as OutboxEventStatus,
      createdAt: event.createdAt.toISOString(),
      processedAt: event.processedAt ? event.processedAt.toISOString() : null,
      retryCount: event.retryCount,
      error: event.error,
      deliveredTo: event.deliveredTo,
      leaseToken: event.leaseToken,
      leaseExpiresAt: event.leaseExpiresAt ? event.leaseExpiresAt.toISOString() : null,
      nextAttemptAt: event.nextAttemptAt ? event.nextAttemptAt.toISOString() : null,
    };
  }
}
