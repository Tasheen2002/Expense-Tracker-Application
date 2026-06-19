import { PrismaClient, Prisma } from '@prisma/client';
import { IOutboxEventRepository } from '../../domain/repositories/outbox-event.repository';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { OutboxEventId } from '../../domain/value-objects/outbox-event-id.vo';
import { AggregateId } from '../../domain/value-objects/aggregate-id.vo';
import { OutboxEventStatus } from '../../domain/enums/outbox-event-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class OutboxEventRepositoryImpl implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: OutboxEvent): Promise<void> {
    const data = {
      id: event.id.getValue(),
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId.getValue(),
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonValue,
      status: event.status,
      createdAt: event.createdAt,
      processedAt: event.processedAt,
      retryCount: event.retryCount,
      error: event.error,
    };

    await this.prisma.outboxEvent.upsert({
      where: { id: event.id.getValue() },
      create: data,
      update: data,
    });
  }

  async saveAll(events: OutboxEvent[]): Promise<void> {
    await this.prisma.$transaction(
      events.map((event) =>
        this.prisma.outboxEvent.upsert({
          where: { id: event.id.getValue() },
          create: {
            id: event.id.getValue(),
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId.getValue(),
            eventType: event.eventType,
            payload: event.payload as Prisma.InputJsonValue,
            status: event.status,
            createdAt: event.createdAt,
            processedAt: event.processedAt,
            retryCount: event.retryCount,
            error: event.error,
          },
          update: {
            status: event.status,
            processedAt: event.processedAt,
            retryCount: event.retryCount,
            error: event.error,
          },
        }),
      ),
    );
  }

  async findById(id: OutboxEventId): Promise<OutboxEvent | null> {
    const record = await this.prisma.outboxEvent.findUnique({
      where: { id: id.getValue() },
    });
    return record ? this.toDomain(record) : null;
  }

  async findPendingEvents(options?: PaginationOptions): Promise<PaginatedResult<OutboxEvent>> {
    const where: Prisma.OutboxEventWhereInput = {
      status: OutboxEventStatus.PENDING,
    };
    return PrismaRepositoryHelper.paginate(
      this.prisma.outboxEvent,
      { where, orderBy: { createdAt: 'asc' } },
      (record) => this.toDomain(record),
      options,
    );
  }

  async findFailedEventsForRetry(
    maxRetries: number,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const where: Prisma.OutboxEventWhereInput = {
      status: OutboxEventStatus.FAILED,
      retryCount: { lt: maxRetries },
    };
    return PrismaRepositoryHelper.paginate(
      this.prisma.outboxEvent,
      { where, orderBy: { createdAt: 'asc' } },
      (record) => this.toDomain(record),
      options,
    );
  }

  async findByStatus(
    status: OutboxEventStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const where: Prisma.OutboxEventWhereInput = { status };
    return PrismaRepositoryHelper.paginate(
      this.prisma.outboxEvent,
      { where, orderBy: { createdAt: 'asc' } },
      (record) => this.toDomain(record),
      options,
    );
  }

  async findByAggregateId(
    aggregateId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const where: Prisma.OutboxEventWhereInput = { aggregateId };
    return PrismaRepositoryHelper.paginate(
      this.prisma.outboxEvent,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options,
    );
  }

  async deleteProcessedEvents(olderThan: Date): Promise<number> {
    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: OutboxEventStatus.PROCESSED,
        processedAt: { lt: olderThan },
      },
    });
    return result.count;
  }

  async countByStatus(status: OutboxEventStatus): Promise<number> {
    return this.prisma.outboxEvent.count({ where: { status } });
  }

  private toDomain(record: Prisma.OutboxEventGetPayload<object>): OutboxEvent {
    return OutboxEvent.fromPersistence({
      id: OutboxEventId.fromString(record.id),
      aggregateType: record.aggregateType,
      aggregateId: AggregateId.fromString(record.aggregateId),
      eventType: record.eventType,
      payload: record.payload as Record<string, unknown>,
      status: record.status as OutboxEventStatus,
      createdAt: record.createdAt,
      processedAt: record.processedAt ?? undefined,
      retryCount: record.retryCount,
      error: record.error ?? undefined,
    });
  }
}
