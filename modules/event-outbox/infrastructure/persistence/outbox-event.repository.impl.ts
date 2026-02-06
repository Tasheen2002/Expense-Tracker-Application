import { PrismaClient, Prisma } from "@prisma/client";
import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { OutboxEventId } from "../../domain/value-objects/outbox-event-id";
import { AggregateId } from "../../domain/value-objects/aggregate-id";
import { OutboxEventStatus } from "../../domain/enums/outbox-event-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

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
    const where: Prisma.OutboxEventWhereInput = {
      status: "PENDING" as OutboxEventStatus,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.outboxEvent,
      { where, orderBy: { createdAt: "asc" } },
      (record) =>
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
      options,
    );
  }

  async findFailedEventsForRetry(
    maxRetries: number,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const where: Prisma.OutboxEventWhereInput = {
      status: "FAILED" as OutboxEventStatus,
      retryCount: { lt: maxRetries },
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.outboxEvent,
      { where, orderBy: { createdAt: "asc" } },
      (record) =>
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
      options,
    );
  }

  async findByStatus(
    status: OutboxEventStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const where: Prisma.OutboxEventWhereInput = {
      status: status as OutboxEventStatus,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.outboxEvent,
      { where, orderBy: { createdAt: "asc" } },
      (record) =>
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
      { where, orderBy: { createdAt: "desc" } },
      (record) =>
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
      options,
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
