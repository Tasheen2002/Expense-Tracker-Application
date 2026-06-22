import { PrismaClient } from '../generated/prisma-client';
import { IOutboxEventRepository, OutboxEventDTO, OutboxEventStatus } from '@expense-tracker/outbox-kit';

export class PrismaOutboxEventRepository implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPending(limit: number): Promise<OutboxEventDTO[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return events.map(this.toDTO);
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
    return events.map(this.toDTO);
  }

  async updateStatus(id: string, status: OutboxEventStatus, error?: string | null): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: status as any,
        processedAt: status === 'PROCESSED' ? new Date() : null,
        error: error || null,
      },
    });
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        error,
        status: 'FAILED',
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
        payload: event.payload as any,
        status: 'PENDING',
      },
    });
  }

  private toDTO(event: any): OutboxEventDTO {
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
    };
  }
}
