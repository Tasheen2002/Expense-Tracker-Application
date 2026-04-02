import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { SyncSession } from '../../domain/entities/sync-session.entity';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
import { SyncAlreadyInProgressError } from '../../domain/errors/bank-feed-sync.errors';
import { SyncTooFrequentError } from '../../domain/errors/bank-feed-sync.errors';
import { SyncTransactionsCommand } from '../commands/sync-transactions.command';
import {
  MIN_SYNC_INTERVAL_MINUTES,
  DEFAULT_LOOKBACK_DAYS,
} from '../../domain/constants/bank-feed-sync.constants';

export interface BankAPITransaction {
  externalId: string;
  amount: number;
  currency: string;
  description: string;
  merchantName?: string;
  categoryName?: string;
  transactionDate: Date;
  postedDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface IBankAPIClient {
  fetchTransactions(
    accessToken: string,
    fromDate: Date,
    toDate: Date
  ): Promise<BankAPITransaction[]>;
}

export class TransactionSyncService {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository,
    private readonly sessionRepository: ISyncSessionRepository,
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly bankAPIClient: IBankAPIClient
  ) {}

  async syncTransactions(
    command: SyncTransactionsCommand
  ): Promise<SyncSession> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const connectionId = BankConnectionId.fromString(command.connectionId);

    // Validate connection exists and is active
    const connection = await this.connectionRepository.findById(
      connectionId,
      workspaceId
    );

    if (!connection) {
      throw new BankConnectionNotFoundError(command.connectionId);
    }

    // Check for active sync
    const activeSync = await this.sessionRepository.findActiveByConnection(
      workspaceId,
      connectionId
    );

    if (activeSync) {
      throw new SyncAlreadyInProgressError(command.connectionId);
    }

    // Check sync frequency
    const latestSync = await this.sessionRepository.findLatestByConnection(
      workspaceId,
      connectionId
    );

    if (latestSync) {
      const minutesSinceLastSync =
        (Date.now() - latestSync.startedAt.getTime()) / 1000 / 60;
      if (minutesSinceLastSync < MIN_SYNC_INTERVAL_MINUTES) {
        const minutesUntilNext = Math.ceil(
          MIN_SYNC_INTERVAL_MINUTES - minutesSinceLastSync
        );
        throw new SyncTooFrequentError(minutesUntilNext);
      }
    }

    // Create sync session
    const session = SyncSession.create(workspaceId, connectionId, {
      fromDate: command.fromDate,
      toDate: command.toDate,
    });

    await this.sessionRepository.save(session);

    // Start sync
    session.start();
    await this.sessionRepository.save(session);

    try {
      // Calculate date range
      const toDate = command.toDate || new Date();
      const fromDate =
        command.fromDate ||
        new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

      // Fetch transactions from bank API
      const apiTransactions = await this.bankAPIClient.fetchTransactions(
        connection.getAccessTokenForSync(),
        fromDate,
        toDate
      );

      let imported = 0;
      let duplicates = 0;

      // Batch check for existing transactions to avoid N+1 queries
      const existingExternalIds =
        await this.transactionRepository.findByExternalIds(
          workspaceId,
          apiTransactions.map((t) => t.externalId)
        );

      // Process each transaction
      const transactions: BankTransaction[] = [];
      for (const apiTxn of apiTransactions) {
        if (existingExternalIds.has(apiTxn.externalId)) {
          duplicates++;
          continue;
        }

        const transaction = BankTransaction.create(
          workspaceId,
          connectionId,
          session.id,
          apiTxn.externalId,
          apiTxn.amount,
          apiTxn.currency,
          apiTxn.description,
          apiTxn.transactionDate,
          apiTxn.merchantName,
          apiTxn.categoryName,
          apiTxn.postedDate,
          apiTxn.metadata
        );

        transactions.push(transaction);
        imported++;
      }

      // Batch save transactions
      if (transactions.length > 0) {
        await this.transactionRepository.saveBatch(transactions);
      }

      // Complete session
      session.complete(apiTransactions.length, imported, duplicates);
      await this.sessionRepository.save(session);

      // Update connection last sync timestamp
      connection.updateLastSync();
      await this.connectionRepository.save(connection);

      return session;
    } catch (error) {
      // Mark session as failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      session.fail(errorMessage);
      await this.sessionRepository.save(session);

      // Mark connection as error
      connection.markAsError(errorMessage);
      await this.connectionRepository.save(connection);

      throw error;
    }
  }
}




