import { PrismaClient } from "@prisma/client";
import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { OutboxEventId } from "../../domain/value-objects/outbox-event-id";
import { AggregateId } from "../../domain/value-objects/aggregate-id";
import { OutboxEventStatus } from "../../domain/enums/outbox-event-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class OutboxEventRepositoryImpl implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: OutboxEvent): Promise<void> {
    const data = {
      id: event.id.getValue(),
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId.getValue(),
      eventType: event.eventType,
      payload: event.payload as any,
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
            payload: event.payload as any,
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

    if (!record) return null;

    return OutboxEvent.reconstitute({
      id: OutboxEventId.fromString(record.id),
      aggregateType: record.aggregateType,
      aggregateId: AggregateId.fromString(record.aggregateId),
      eventType: record.eventType,
      payload: record.payload as Record<string, any>,
      status: record.status as OutboxEventStatus,
      createdAt: record.createdAt,
      processedAt: record.processedAt ?? undefined,
      retryCount: record.retryCount,
      error: record.error ?? undefined,
    });
  }

  async findPendingEvents(
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = { status: "PENDING" as OutboxEventStatus };

    const [rows, total] = await Promise.all([
      this.prisma.outboxEvent.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.outboxEvent.count({ where }),
    ]);

    return {
      items: rows.map((record) =>
        OutboxEvent.reconstitute({
          id: OutboxEventId.fromString(record.id),
          aggregateType: record.aggregateType,
          aggregateId: AggregateId.fromString(record.aggregateId),
          eventType: record.eventType,
          payload: record.payload as Record<string, any>,
          status: record.status as OutboxEventStatus,
          createdAt: record.createdAt,
          processedAt: record.processedAt ?? undefined,
          retryCount: record.retryCount,
          error: record.error ?? undefined,
        }),
      ),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findFailedEventsForRetry(
    maxRetries: number,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = {
      status: "FAILED" as OutboxEventStatus,
      retryCount: { lt: maxRetries },
    };

    const [rows, total] = await Promise.all([
      this.prisma.outboxEvent.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.outboxEvent.count({ where }),
    ]);

    return {
      items: rows.map((record) =>
        OutboxEvent.reconstitute({
          id: OutboxEventId.fromString(record.id),
          aggregateType: record.aggregateType,
          aggregateId: AggregateId.fromString(record.aggregateId),
          eventType: record.eventType,
          payload: record.payload as Record<string, any>,
          status: record.status as OutboxEventStatus,
          createdAt: record.createdAt,
          processedAt: record.processedAt ?? undefined,
          retryCount: record.retryCount,
          error: record.error ?? undefined,
        }),
      ),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findByStatus(
    status: OutboxEventStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = { status };

    const [rows, total] = await Promise.all([
      this.prisma.outboxEvent.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.outboxEvent.count({ where }),
    ]);

    return {
      items: rows.map((record) =>
        OutboxEvent.reconstitute({
          id: OutboxEventId.fromString(record.id),
          aggregateType: record.aggregateType,
          aggregateId: AggregateId.fromString(record.aggregateId),
          eventType: record.eventType,
          payload: record.payload as Record<string, any>,
          status: record.status as OutboxEventStatus,
          createdAt: record.createdAt,
          processedAt: record.processedAt ?? undefined,
          retryCount: record.retryCount,
          error: record.error ?? undefined,
        }),
      ),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findByAggregateId(aggregateId: string): Promise<OutboxEvent[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: { aggregateId },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) =>
      OutboxEvent.reconstitute({
        id: OutboxEventId.fromString(record.id),
        aggregateType: record.aggregateType,
        aggregateId: AggregateId.fromString(record.aggregateId),
        eventType: record.eventType,
        payload: record.payload as Record<string, any>,
        status: record.status as OutboxEventStatus,
        createdAt: record.createdAt,
        processedAt: record.processedAt ?? undefined,
        retryCount: record.retryCount,
        error: record.error ?? undefined,
      }),
    );
  }

  async deleteProcessedEvents(olderThan: Date): Promise<number> {
    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: "PROCESSED",
        processedAt: { lt: olderThan },
      },
    });

    return result.count;
  }

  async countByStatus(status: OutboxEventStatus): Promise<number> {
    return await this.prisma.outboxEvent.count({
      where: { status },
    });
  }
}
