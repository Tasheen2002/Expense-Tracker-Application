import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankTransactionId } from '../../domain/value-objects/bank-transaction-id';
import { SyncSessionId } from '../../domain/value-objects/sync-session-id';
import { ISyncCompletionWriter } from '../ports/sync-completion-writer';
import { BankConnection, BankConnectionDTO } from '../../domain/entities/bank-connection.entity';
import { SyncSession, SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import { BankTransaction, BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { SyncStatus } from '../../domain/enums/sync-status.enum';
import { ConnectionStatus } from '../../domain/enums/connection-status.enum';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import {
  BankFeedSyncDomainError,
  BankConnectionNotFoundError,
  BankConnectionAlreadyExistsError,
  BankTransactionNotFoundError,
  SyncSessionNotFoundError,
  SyncAlreadyInProgressError,
  SyncTooFrequentError,
  MissingExpenseIdError,
  InvalidTransactionActionError,
  InvalidBankTokenError,
} from '../../domain/errors/bank-feed-sync.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import {
  MIN_SYNC_INTERVAL_MINUTES,
  DEFAULT_LOOKBACK_DAYS,
  MAX_LOOKBACK_DAYS,
  MAX_TRANSACTIONS_PER_SYNC,
  STALE_SYNC_MINUTES,
} from '../../domain/constants/bank-feed-sync.constants';

export interface BankAPITransaction {
  externalId: string;
  amount: string;
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

export interface IExpenseReferenceChecker {
  exists(input: {
    workspaceId: string;
    expenseId: string;
    actorId: string;
    authorization: string;
  }): Promise<boolean>;
}

export class TransactionSyncService {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository,
    private readonly sessionRepository: ISyncSessionRepository,
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly bankAPIClient: IBankAPIClient,
    private readonly expenseReferenceChecker: IExpenseReferenceChecker,
    private readonly syncCompletionWriter: ISyncCompletionWriter
  ) {}

  async connectBank(command: {
    workspaceId: string;
    userId: string;
    institutionId: string;
    institutionName: string;
    accountId: string;
    accountName: string;
    accountType: string;
    currency: string;
    accessToken: string;
    accountMask?: string;
    tokenExpiresAt?: Date;
  }): Promise<BankConnectionDTO> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const userId = UserId.fromString(command.userId);

    const existing = await this.connectionRepository.findByInstitutionAndAccount(
      workspaceId,
      command.institutionId,
      command.accountId
    );

    if (existing) {
      if (existing.status !== ConnectionStatus.DISCONNECTED && existing.status !== ConnectionStatus.DELETED) {
        throw new BankConnectionAlreadyExistsError(command.institutionId, command.accountId);
      }
      existing.reconnect({
        userId,
        institutionName: command.institutionName,
        accountName: command.accountName,
        accountType: command.accountType,
        currency: command.currency,
        accessToken: command.accessToken,
        accountMask: command.accountMask,
        tokenExpiresAt: command.tokenExpiresAt,
      });
      await this.connectionRepository.save(existing);
      return BankConnection.toDTO(existing);
    }

    const connection = BankConnection.create(
      workspaceId,
      userId,
      command.institutionId,
      command.institutionName,
      command.accountId,
      command.accountName,
      command.accountType,
      command.currency,
      command.accessToken,
      command.accountMask,
      command.tokenExpiresAt
    );

    connection.activate();
    await this.connectionRepository.save(connection);

    return BankConnection.toDTO(connection);
  }

  async syncTransactions(
    command: {
      workspaceId: string;
      connectionId: string;
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<SyncSessionDTO> {
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
    if (!connection.isActive()) {
      throw new BankFeedSyncDomainError('Bank connection is not active', 'BANK_CONNECTION_INACTIVE', 409);
    }

    const toDate = command.toDate || new Date();
    const fromDate = command.fromDate ||
      new Date(toDate.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) ||
        fromDate > toDate ||
        toDate.getTime() - fromDate.getTime() > MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) {
      throw new BankFeedSyncDomainError('Invalid sync date range', 'INVALID_SYNC_DATE_RANGE', 422);
    }

    await this.sessionRepository.expireStaleByConnection(
      workspaceId,
      connectionId,
      new Date(Date.now() - STALE_SYNC_MINUTES * 60 * 1000)
    );

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
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    });

    await this.sessionRepository.save(session);

    try {
      // Start sync
      session.start();
      await this.sessionRepository.save(session);

      // Fetch transactions from bank API
      const apiTransactions = await this.bankAPIClient.fetchTransactions(
        connection.accessTokenForSync,
        fromDate,
        toDate
      );
      if (apiTransactions.length > MAX_TRANSACTIONS_PER_SYNC) {
        throw new BankFeedSyncDomainError('Bank provider returned too many transactions', 'SYNC_RESULT_TOO_LARGE', 422);
      }

      // Batch check for existing transactions to avoid N+1 queries
      const existingExternalIds =
        await this.transactionRepository.findByExternalIds(
          workspaceId,
          connectionId,
          apiTransactions.map((t) => t.externalId)
        );

      // Process each transaction
      const transactions: BankTransaction[] = [];
      const seenExternalIds = new Set(existingExternalIds);
      for (const apiTxn of apiTransactions) {
        if (seenExternalIds.has(apiTxn.externalId)) {
          continue;
        }
        seenExternalIds.add(apiTxn.externalId);

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
      }

      await this.syncCompletionWriter.commit({
        connection,
        session,
        transactions,
        finalize: (imported) => {
          session.complete(apiTransactions.length, imported, apiTransactions.length - imported);
          connection.updateLastSync();
        },
      });

      return SyncSession.toDTO(session);
    } catch (error) {
      // Mark session as failed
      const errorMessage =
        error instanceof BankFeedSyncDomainError ? error.message : 'Sync failed due to an internal error';
      const persistedSession = await this.sessionRepository.findById(session.id, workspaceId);
      if (persistedSession &&
          (persistedSession.status === SyncStatus.PENDING || persistedSession.status === SyncStatus.IN_PROGRESS)) {
        persistedSession.fail(errorMessage, connection.userId);
        await this.sessionRepository.save(persistedSession);

        if (error instanceof InvalidBankTokenError) {
          // A concurrent disconnect or deletion must not be overwritten by this sync.
          connection.markAsError(errorMessage);
          await this.connectionRepository.recordSyncFailure(connection);
        }
      }

      throw error;
    }
  }

  // ==========================================
  // Connection read & mutation methods
  // ==========================================

  async getConnection(connectionId: string, workspaceId: string): Promise<BankConnectionDTO> {
    const connection = await this.connectionRepository.findById(
      BankConnectionId.fromString(connectionId),
      WorkspaceId.fromString(workspaceId)
    );
    if (!connection) {
      throw new BankConnectionNotFoundError(connectionId);
    }
    return BankConnection.toDTO(connection);
  }

  async getConnections(
    workspaceId: string,
    userId?: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankConnectionDTO>> {
    const wsId = WorkspaceId.fromString(workspaceId);
    let result;
    if (userId) {
      result = await this.connectionRepository.findByUser(wsId, UserId.fromString(userId), options);
    } else {
      result = await this.connectionRepository.findByWorkspace(wsId, options);
    }
    return { ...result, items: result.items.map((c) => BankConnection.toDTO(c)) };
  }

  async disconnectBank(connectionId: string, workspaceId: string): Promise<void> {
    const connection = await this.connectionRepository.findById(
      BankConnectionId.fromString(connectionId),
      WorkspaceId.fromString(workspaceId)
    );
    if (!connection) {
      throw new BankConnectionNotFoundError(connectionId);
    }
    connection.disconnect();
    await this.connectionRepository.save(connection);
  }

  async deleteConnection(connectionId: string, workspaceId: string): Promise<void> {
    const connId = BankConnectionId.fromString(connectionId);
    const wsId = WorkspaceId.fromString(workspaceId);
    const connection = await this.connectionRepository.findById(connId, wsId);
    if (!connection) {
      throw new BankConnectionNotFoundError(connectionId);
    }
    connection.markAsDeleted();
    await this.connectionRepository.save(connection);
  }

  async updateConnectionToken(
    connectionId: string,
    workspaceId: string,
    accessToken: string,
    tokenExpiresAt?: Date
  ): Promise<void> {
    const connection = await this.connectionRepository.findById(
      BankConnectionId.fromString(connectionId),
      WorkspaceId.fromString(workspaceId)
    );
    if (!connection) {
      throw new BankConnectionNotFoundError(connectionId);
    }
    connection.updateAccessToken(accessToken, tokenExpiresAt);
    await this.connectionRepository.save(connection);
  }

  // ==========================================
  // Transaction read & mutation methods
  // ==========================================

  async getTransaction(transactionId: string, workspaceId: string): Promise<BankTransactionDTO> {
    const transaction = await this.transactionRepository.findById(
      BankTransactionId.fromString(transactionId),
      WorkspaceId.fromString(workspaceId)
    );
    if (!transaction) {
      throw new BankTransactionNotFoundError(transactionId);
    }
    return BankTransaction.toDTO(transaction);
  }

  async getTransactionsByConnection(
    workspaceId: string,
    connectionId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankTransactionDTO>> {
    const result = await this.transactionRepository.findByConnection(
      WorkspaceId.fromString(workspaceId),
      BankConnectionId.fromString(connectionId),
      options
    );
    return { ...result, items: result.items.map((tx) => BankTransaction.toDTO(tx)) };
  }

  async getPendingTransactions(
    workspaceId: string,
    connectionId?: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankTransactionDTO>> {
    const wsId = WorkspaceId.fromString(workspaceId);
    let result: PaginatedResult<BankTransaction>;
    if (connectionId) {
      result = await this.transactionRepository.findByConnectionAndStatus(
        wsId,
        BankConnectionId.fromString(connectionId),
        TransactionStatus.PENDING,
        options
      );
    } else {
      result = await this.transactionRepository.findByStatus(wsId, TransactionStatus.PENDING, options);
    }
    return { ...result, items: result.items.map((tx) => BankTransaction.toDTO(tx)) };
  }

  async processTransaction(params: {
    workspaceId: string;
    transactionId: string;
    actorId: string;
    action: 'import' | 'match' | 'ignore';
    expenseId?: string;
    authToken?: string;
  }): Promise<void> {
    const transaction = await this.transactionRepository.findById(
      BankTransactionId.fromString(params.transactionId),
      WorkspaceId.fromString(params.workspaceId)
    );
    if (!transaction) {
      throw new BankTransactionNotFoundError(params.transactionId);
    }
    if (params.action === 'import' || params.action === 'match') {
      if (!params.expenseId) throw new MissingExpenseIdError(params.action);
      if (!params.authToken) {
        throw new BankFeedSyncDomainError('Authentication token is required', 'AUTH_TOKEN_REQUIRED', 401);
      }
      if (!await this.expenseReferenceChecker.exists({
        workspaceId: params.workspaceId,
        expenseId: params.expenseId,
        actorId: params.actorId,
        authorization: params.authToken,
      })) {
        throw new BankFeedSyncDomainError('Expense not found in workspace', 'EXPENSE_REFERENCE_NOT_FOUND', 404);
      }
    }
    switch (params.action) {
      case 'import':
        if (!params.expenseId) throw new MissingExpenseIdError('import');
        transaction.markAsImported(params.expenseId);
        break;
      case 'match':
        if (!params.expenseId) throw new MissingExpenseIdError('match');
        transaction.markAsMatched(params.expenseId);
        break;
      case 'ignore':
        transaction.markAsIgnored();
        break;
      default:
        throw new InvalidTransactionActionError(params.action);
    }
    await this.transactionRepository.save(transaction);
  }

  // ==========================================
  // Sync session read methods
  // ==========================================

  async getSyncSession(sessionId: string, workspaceId: string): Promise<SyncSessionDTO> {
    const session = await this.sessionRepository.findById(
      SyncSessionId.fromString(sessionId),
      WorkspaceId.fromString(workspaceId)
    );
    if (!session) {
      throw new SyncSessionNotFoundError(sessionId);
    }
    return SyncSession.toDTO(session);
  }

  async getSyncHistory(
    workspaceId: string,
    connectionId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SyncSessionDTO>> {
    const result = await this.sessionRepository.findByConnection(
      WorkspaceId.fromString(workspaceId),
      BankConnectionId.fromString(connectionId),
      options
    );
    return { ...result, items: result.items.map((s) => SyncSession.toDTO(s)) };
  }

  async getActiveSyncs(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SyncSessionDTO>> {
    const result = await this.sessionRepository.findByStatus(
      WorkspaceId.fromString(workspaceId),
      SyncStatus.IN_PROGRESS,
      options
    );
    return { ...result, items: result.items.map((s) => SyncSession.toDTO(s)) };
  }
}
