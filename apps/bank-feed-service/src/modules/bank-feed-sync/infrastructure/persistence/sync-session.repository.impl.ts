import { PrismaClient, Prisma } from '../../../../prisma-client';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { SyncSession, SyncSessionFailedEvent } from '../../domain/entities/sync-session.entity';
import { SyncSessionId } from '../../domain/value-objects/sync-session-id';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncStatus } from '../../domain/enums/sync-status.enum';
import { SyncAlreadyInProgressError, SyncTooFrequentError, BankFeedSyncDomainError } from '../../domain/errors/bank-feed-sync.errors';
import { MIN_SYNC_INTERVAL_MINUTES } from '../../domain/constants/bank-feed-sync.constants';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class PrismaSyncSessionRepository
  extends PrismaRepository<SyncSession>
  implements ISyncSessionRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(session: SyncSession): Promise<void> {
    const data = this.toPersistence(session);

    try {
      await this.prisma.$transaction(async (tx) => {
        if (session.isPersisted) {
          const priorStatuses = session.status === SyncStatus.IN_PROGRESS
            ? [SyncStatus.PENDING]
            : session.status === SyncStatus.FAILED
              ? [SyncStatus.PENDING, SyncStatus.IN_PROGRESS]
              : [SyncStatus.IN_PROGRESS];
          const { id, workspaceId, connectionId, createdAt, ...mutable } = data;
          const result = await tx.syncSession.updateMany({
            where: {
              id,
              workspaceId,
              connectionId,
              status: { in: priorStatuses },
            },
            data: mutable,
          });
          if (result.count !== 1) {
            throw new BankFeedSyncDomainError('Sync session changed concurrently', 'CONCURRENT_SYNC_TRANSITION', 409);
          }
        } else {
          const activeConnection = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM bank_feed_sync.bank_connection
            WHERE id = ${session.connectionId.getValue()} AND workspace_id = ${session.workspaceId.getValue()}
              AND status = 'CONNECTED'::bank_feed_sync."ConnectionStatus"
              AND (token_expires_at IS NULL OR token_expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
            FOR UPDATE
          `;
          if (activeConnection.length !== 1) {
            throw new BankFeedSyncDomainError('Bank connection is not active', 'BANK_CONNECTION_INACTIVE', 409);
          }
          const latest = await tx.syncSession.findFirst({
            where: { workspaceId: session.workspaceId.getValue(), connectionId: session.connectionId.getValue() },
            orderBy: { startedAt: 'desc' },
          });
          if (latest && (latest.status === SyncStatus.PENDING || latest.status === SyncStatus.IN_PROGRESS)) {
            throw new SyncAlreadyInProgressError(session.connectionId.getValue());
          }
          if (latest) {
            const minutesSinceLastSync = (Date.now() - latest.startedAt.getTime()) / 60_000;
            if (minutesSinceLastSync < MIN_SYNC_INTERVAL_MINUTES) {
              throw new SyncTooFrequentError(Math.ceil(MIN_SYNC_INTERVAL_MINUTES - minutesSinceLastSync));
            }
          }
          await tx.syncSession.create({ data });
        }
        await this.persistOutboxEvents(tx, [session]);
      });
      this.clearPersistedEvents([session]);
      session.markPersisted();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new SyncAlreadyInProgressError(session.connectionId.getValue());
      }
      throw error;
    }
  }

  async expireStaleByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    cutoff: Date
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const where = {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
        status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
        startedAt: { lt: cutoff },
      };
      const stale = await tx.syncSession.findMany({
        where,
        select: { id: true, connection: { select: { userId: true } } },
      });
      let expired = 0;
      for (const row of stale) {
        const result = await tx.syncSession.updateMany({
          where: { ...where, id: row.id },
          data: { status: SyncStatus.FAILED, completedAt: new Date(), errorMessage: 'Sync timed out' },
        });
        if (result.count !== 1) continue;
        expired++;
        const event = new SyncSessionFailedEvent(
          row.id,
          workspaceId.getValue(),
          connectionId.getValue(),
          'Sync timed out',
          row.connection.userId
        );
        await tx.outboxEvent.create({
          data: {
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            payload: event.getPayload() as Prisma.InputJsonValue,
            status: 'PENDING',
          },
        });
      }
      return expired;
    });
  }

  async findById(
    id: SyncSessionId,
    workspaceId: WorkspaceId
  ): Promise<SyncSession | null> {
    const record = await this.prisma.syncSession.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SyncSession>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.syncSession,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          connectionId: connectionId.getValue(),
        },
        orderBy: {
          startedAt: 'desc',
        },
      },
      (r) => this.toDomain(r),
      options
    );
  }

  async findActiveByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId
  ): Promise<SyncSession | null> {
    const record = await this.prisma.syncSession.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
        status: {
          in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findLatestByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId
  ): Promise<SyncSession | null> {
    const record = await this.prisma.syncSession.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByStatus(
    workspaceId: WorkspaceId,
    status: SyncStatus,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SyncSession>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.syncSession,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          status,
        },
        orderBy: {
          startedAt: 'desc',
        },
      },
      (r) => this.toDomain(r),
      options
    );
  }

  private toPersistence(
    session: SyncSession
  ): Prisma.SyncSessionUncheckedCreateInput {
    return {
      id: session.id.getValue(),
      workspaceId: session.workspaceId.getValue(),
      connectionId: session.connectionId.getValue(),
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      transactionsFetched: session.transactionsFetched,
      transactionsImported: session.transactionsImported,
      transactionsDuplicate: session.transactionsDuplicate,
      errorMessage: session.errorMessage,
      metadata: session.metadata as any,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private toDomain(record: Prisma.SyncSessionGetPayload<object>): SyncSession {
    return SyncSession.fromPersistence({
      id: SyncSessionId.fromString(record.id),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      connectionId: BankConnectionId.fromString(record.connectionId),
      status: record.status as SyncStatus,
      startedAt: record.startedAt,
      completedAt: record.completedAt ?? undefined,
      transactionsFetched: record.transactionsFetched,
      transactionsImported: record.transactionsImported,
      transactionsDuplicate: record.transactionsDuplicate,
      errorMessage: record.errorMessage ?? undefined,
      metadata: (record.metadata as Record<string, unknown>) ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
