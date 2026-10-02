import { AggregateRoot } from '@core/domain/aggregate-root';
import { ISyncCompletionWriter } from '../../application/ports/sync-completion-writer';
import { BankFeedSyncDomainError } from '../../domain/errors/bank-feed-sync.errors';
import { ConnectionStatus } from '../../domain/enums/connection-status.enum';
import { SyncStatus } from '../../domain/enums/sync-status.enum';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { PrismaBankTransactionRepository } from './bank-transaction.repository.impl';

export class PrismaSyncCompletionWriter extends PrismaRepository<AggregateRoot> implements ISyncCompletionWriter {
  async commit(input: Parameters<ISyncCompletionWriter['commit']>[0]): Promise<void> {
    const { connection, session, transactions, finalize } = input;
    const workspaceId = connection.workspaceId.getValue();
    const connectionId = connection.id.getValue();
    const sessionId = session.id.getValue();
    const version = connection.version;
    if (session.workspaceId.getValue() !== workspaceId || session.connectionId.getValue() !== connectionId ||
        session.status !== SyncStatus.IN_PROGRESS || !connection.isActive() || transactions.some((transaction) =>
          transaction.workspaceId.getValue() !== workspaceId ||
          transaction.connectionId.getValue() !== connectionId ||
          transaction.sessionId.getValue() !== sessionId ||
          transaction.status !== TransactionStatus.PENDING)) {
      throw new BankFeedSyncDomainError('Invalid sync completion batch', 'INVALID_SYNC_BATCH', 422);
    }

    const inserted = await this.prisma.$transaction(async (tx) => {
      // The order matches the import path: connection first, then session.
      const activeConnection = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM bank_feed_sync.bank_connection
        WHERE id = ${connectionId} AND workspace_id = ${workspaceId} AND version = ${version}
          AND status = 'CONNECTED'::bank_feed_sync."ConnectionStatus"
          AND (token_expires_at IS NULL OR token_expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
        FOR UPDATE
      `;
      if (activeConnection.length !== 1) {
        throw new BankFeedSyncDomainError('Bank connection changed during sync', 'CONCURRENT_CONNECTION_MODIFICATION', 409);
      }
      const activeSession = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM bank_feed_sync.sync_session
        WHERE id = ${sessionId} AND workspace_id = ${workspaceId} AND connection_id = ${connectionId}
          AND status = 'IN_PROGRESS'::bank_feed_sync."SyncStatus"
        FOR UPDATE
      `;
      if (activeSession.length !== 1) {
        throw new BankFeedSyncDomainError('Sync session is no longer active', 'CONCURRENT_SYNC_TRANSITION', 409);
      }

      if (transactions.length) {
        await tx.bankTransaction.createMany({
          data: transactions.map((transaction) => PrismaBankTransactionRepository.toPersistence(transaction)),
          skipDuplicates: true,
        });
      }
      const rows = transactions.length ? await tx.bankTransaction.findMany({
        where: { id: { in: transactions.map((transaction) => transaction.id.getValue()) }, workspaceId, connectionId, sessionId },
        select: { id: true },
      }) : [];
      const insertedIds = new Set(rows.map((row) => row.id));
      const insertedTransactions = [...new Map(transactions
        .filter((transaction) => insertedIds.has(transaction.id.getValue()))
        .map((transaction) => [transaction.id.getValue(), transaction] as const)).values()];

      // Application code owns the domain decisions; the adapter owns their atomic persistence.
      finalize(insertedIds.size);
      if (session.status !== SyncStatus.COMPLETED || !connection.lastSyncAt) {
        throw new BankFeedSyncDomainError('Sync completion must finalize its aggregates', 'INVALID_SYNC_COMPLETION', 422);
      }
      const completed = await tx.syncSession.updateMany({
        where: { id: sessionId, workspaceId, connectionId, status: SyncStatus.IN_PROGRESS },
        data: {
          status: session.status,
          completedAt: session.completedAt,
          transactionsFetched: session.transactionsFetched,
          transactionsImported: session.transactionsImported,
          transactionsDuplicate: session.transactionsDuplicate,
          updatedAt: session.updatedAt,
        },
      });
      const synced = await tx.bankConnection.updateMany({
        where: { id: connectionId, workspaceId, version, status: ConnectionStatus.CONNECTED },
        data: { lastSyncAt: connection.lastSyncAt, updatedAt: connection.updatedAt, version: { increment: 1 } },
      });
      if (completed.count !== 1 || synced.count !== 1) {
        throw new BankFeedSyncDomainError('Sync changed concurrently', 'CONCURRENT_SYNC_TRANSITION', 409);
      }
      await this.persistOutboxEvents(tx, [...insertedTransactions, session, connection]);
      return insertedTransactions;
    });

    this.clearPersistedEvents([...inserted, session, connection]);
    session.markPersisted();
    connection.markPersisted(version + 1);
  }
}
