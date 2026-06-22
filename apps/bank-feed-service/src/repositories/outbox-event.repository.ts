import { PrismaClient } from '@prisma/client';
import { IOutboxEventRepository, OutboxEventDTO, OutboxEventStatus } from '@expense-tracker/outbox-kit';
import { v4 as uuidv4 } from 'uuid';

export class PrismaOutboxEventRepository implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPending(limit: number): Promise<OutboxEventDTO[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return records.map(r => this.toDTO(r));
  }

  async findFailed(limit: number, maxRetries: number): Promise<OutboxEventDTO[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: maxRetries },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return records.map(r => this.toDTO(r));
  }

  async updateStatus(id: string, status: OutboxEventStatus, error?: string | null): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: status as any,
        processedAt: status === 'PROCESSED' ? new Date() : undefined,
        error: error || null,
      },
    });
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        status: 'FAILED',
        error: error,
      },
    });
  }

  async deleteProcessedBefore(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: 'PROCESSED',
        processedAt: { lt: cutoff },
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
        id: uuidv4(),
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as any,
        status: 'PENDING',
      },
    });
  }

  private toDTO(record: any): OutboxEventDTO {
    return {
      id: record.id,
      aggregateType: record.aggregateType,
      aggregateId: record.aggregateId,
      eventType: record.eventType,
      payload: record.payload as Record<string, unknown>,
      status: record.status as OutboxEventStatus,
      createdAt: record.createdAt.toISOString(),
      processedAt: record.processedAt ? record.processedAt.toISOString() : null,
      retryCount: record.retryCount,
      error: record.error,
    };
  }
}
export default PrismaOutboxEventRepository;
