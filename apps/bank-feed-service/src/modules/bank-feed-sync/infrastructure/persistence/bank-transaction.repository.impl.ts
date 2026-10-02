import { PrismaClient, Prisma } from '../../../../prisma-client';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { BankTransactionId } from '../../domain/value-objects/bank-transaction-id';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { SyncSessionId } from '../../domain/value-objects/sync-session-id';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { DUPLICATE_TIME_THRESHOLD_MINUTES } from '../../domain/constants/bank-feed-sync.constants';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import { BankFeedSyncDomainError } from '../../domain/errors/bank-feed-sync.errors';

export class PrismaBankTransactionRepository
  extends PrismaRepository<BankTransaction>
  implements IBankTransactionRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(transaction: BankTransaction): Promise<void> {
    if (transaction.status === TransactionStatus.PENDING) {
      throw new BankFeedSyncDomainError('Use saveBatch to import pending transactions', 'INVALID_TRANSACTION_WRITE', 422);
    }
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.bankTransaction.updateMany({
        where: {
          id: transaction.id.getValue(),
          workspaceId: transaction.workspaceId.getValue(),
          status: TransactionStatus.PENDING,
        },
        data: {
          status: transaction.status,
          expenseId: transaction.expenseId,
          updatedAt: transaction.updatedAt,
        },
      });
      if (result.count !== 1) {
        throw new BankFeedSyncDomainError('Transaction was already processed', 'INVALID_TRANSACTION_TRANSITION', 409);
      }
      await this.persistOutboxEvents(tx, [transaction]);
    });
    this.clearPersistedEvents([transaction]);
  }

  async saveBatch(transactions: BankTransaction[], expectedConnectionVersion: number): Promise<number> {
    if (transactions.length === 0) return 0;
    const first = transactions[0];
    const workspaceId = first.workspaceId.getValue();
    const connectionId = first.connectionId.getValue();
    const sessionId = first.sessionId.getValue();
    if (transactions.some((transaction) =>
      transaction.workspaceId.getValue() !== workspaceId ||
      transaction.connectionId.getValue() !== connectionId ||
      transaction.sessionId.getValue() !== sessionId
    )) {
      throw new BankFeedSyncDomainError('A sync batch must belong to one connection', 'INVALID_SYNC_BATCH', 422);
    }
    const data = transactions.map((t) => PrismaBankTransactionRepository.toPersistence(t));

    const insertedIds = await this.prisma.$transaction(async (tx) => {
      const activeConnection = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM bank_feed_sync.bank_connection
        WHERE id = ${connectionId} AND workspace_id = ${workspaceId}
          AND version = ${expectedConnectionVersion}
          AND status = 'CONNECTED'::bank_feed_sync."ConnectionStatus"
        FOR UPDATE
      `;
      if (activeConnection.length === 0) {
        throw new BankFeedSyncDomainError('Bank connection is no longer active', 'BANK_CONNECTION_INACTIVE', 409);
      }
      const activeSession = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM bank_feed_sync.sync_session
        WHERE id = ${sessionId} AND workspace_id = ${workspaceId}
          AND connection_id = ${connectionId}
          AND status = 'IN_PROGRESS'::bank_feed_sync."SyncStatus"
        FOR UPDATE
      `;
      if (activeSession.length === 0) {
        throw new BankFeedSyncDomainError('Sync session is no longer active', 'CONCURRENT_SYNC_TRANSITION', 409);
      }
      await tx.bankTransaction.createMany({
        data,
        skipDuplicates: true,
      });
      const inserted = await tx.bankTransaction.findMany({
        where: { id: { in: transactions.map((transaction) => transaction.id.getValue()) } },
        select: { id: true },
      });
      const ids = new Set(inserted.map((row) => row.id));
      const insertedAggregates = new Map(
        transactions
          .filter((transaction) => ids.has(transaction.id.getValue()))
          .map((transaction) => [transaction.id.getValue(), transaction] as const)
      );
      await this.persistOutboxEvents(tx, [...insertedAggregates.values()]);
      return ids;
    });
    this.clearPersistedEvents(
      transactions.filter((transaction) => insertedIds.has(transaction.id.getValue()))
    );
    return insertedIds.size;
  }

  async findById(
    id: BankTransactionId,
    workspaceId: WorkspaceId
  ): Promise<BankTransaction | null> {
    const record = await this.prisma.bankTransaction.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByExternalId(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    externalId: string
  ): Promise<BankTransaction | null> {
    const record = await this.prisma.bankTransaction.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
        externalId,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByExternalIds(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    externalIds: string[]
  ): Promise<Set<string>> {
    if (externalIds.length === 0) return new Set();

    const records = await this.prisma.bankTransaction.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
        externalId: { in: externalIds },
      },
      select: { externalId: true },
    });

    return new Set(records.map((r) => r.externalId));
  }

  async findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          connectionId: connectionId.getValue(),
        },
        orderBy: {
          transactionDate: 'desc',
        },
      },
      (r) => this.toDomain(r),
      options
    );
  }

  async findBySession(
    workspaceId: WorkspaceId,
    sessionId: SyncSessionId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          sessionId: sessionId.getValue(),
        },
        orderBy: {
          transactionDate: 'desc',
        },
      },
      (r) => this.toDomain(r),
      options
    );
  }

  async findByStatus(
    workspaceId: WorkspaceId,
    status: TransactionStatus,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          status,
        },
        orderBy: {
          transactionDate: 'desc',
        },
      },
      (r) => this.toDomain(r),
      options
    );
  }

  async findByConnectionAndStatus(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    status: TransactionStatus,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          connectionId: connectionId.getValue(),
          status,
        },
        orderBy: {
          transactionDate: 'desc',
        },
      },
      (r) => this.toDomain(r),
      options
    );
  }

  async findPotentialDuplicates(
    workspaceId: WorkspaceId,
    amount: string,
    transactionDate: Date,
    description: string
  ): Promise<BankTransaction[]> {
    const startDate = new Date(
      transactionDate.getTime() - DUPLICATE_TIME_THRESHOLD_MINUTES * 60 * 1000
    );
    const endDate = new Date(
      transactionDate.getTime() + DUPLICATE_TIME_THRESHOLD_MINUTES * 60 * 1000
    );

    const records = await this.prisma.bankTransaction.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        amount: new Prisma.Decimal(amount),
        description,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  static toPersistence(
    transaction: BankTransaction
  ): Prisma.BankTransactionUncheckedCreateInput {
    return {
      id: transaction.id.getValue(),
      workspaceId: transaction.workspaceId.getValue(),
      connectionId: transaction.connectionId.getValue(),
      sessionId: transaction.sessionId.getValue(),
      externalId: transaction.externalId,
      amount: new Prisma.Decimal(transaction.amount),
      currency: transaction.currency,
      description: transaction.description,
      merchantName: transaction.merchantName,
      categoryName: transaction.categoryName,
      transactionDate: transaction.transactionDate,
      postedDate: transaction.postedDate,
      status: transaction.status,
      expenseId: transaction.expenseId,
      metadata: transaction.metadata as any,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  private toDomain(
    record: Prisma.BankTransactionGetPayload<object>
  ): BankTransaction {
    return BankTransaction.fromPersistence({
      id: BankTransactionId.fromString(record.id),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      connectionId: BankConnectionId.fromString(record.connectionId),
      sessionId: SyncSessionId.fromString(record.sessionId),
      externalId: record.externalId,
      amount: record.amount.toString(),
      currency: record.currency,
      description: record.description,
      merchantName: record.merchantName ?? undefined,
      categoryName: record.categoryName ?? undefined,
      transactionDate: record.transactionDate,
      postedDate: record.postedDate ?? undefined,
      status: record.status as TransactionStatus,
      expenseId: record.expenseId ?? undefined,
      metadata: (record.metadata as Record<string, unknown>) ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
