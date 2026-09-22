import { PrismaClient } from '@prisma/client';
import { getEventBus, InMemoryEventBus, DomainEvent, DomainEventHandler } from '@expense-tracker/core';

// Outbox repo
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';

// Repositories
import { PrismaBankConnectionRepository } from './modules/bank-feed-sync/infrastructure/persistence/bank-connection.repository.impl';
import { PrismaSyncSessionRepository } from './modules/bank-feed-sync/infrastructure/persistence/sync-session.repository.impl';
import { PrismaBankTransactionRepository } from './modules/bank-feed-sync/infrastructure/persistence/bank-transaction.repository.impl';

// Services
import { TransactionSyncService } from './modules/bank-feed-sync/application/services/transaction-sync.service';

// Command Handlers
import { ConnectBankHandler } from './modules/bank-feed-sync/application/commands/connect-bank.command';
import { DisconnectBankHandler } from './modules/bank-feed-sync/application/commands/disconnect-bank.command';
import { UpdateConnectionTokenHandler } from './modules/bank-feed-sync/application/commands/update-connection-token.command';
import { DeleteConnectionHandler } from './modules/bank-feed-sync/application/commands/delete-connection.command';
import { SyncTransactionsHandler } from './modules/bank-feed-sync/application/commands/sync-transactions.command';
import { ProcessTransactionHandler } from './modules/bank-feed-sync/application/commands/process-transaction.command';

// Query Handlers
import { GetBankConnectionsHandler } from './modules/bank-feed-sync/application/queries/get-bank-connections.query';
import { GetBankConnectionHandler } from './modules/bank-feed-sync/application/queries/get-bank-connection.query';
import { GetSyncHistoryHandler } from './modules/bank-feed-sync/application/queries/get-sync-history.query';
import { GetSyncSessionHandler } from './modules/bank-feed-sync/application/queries/get-sync-session.query';
import { GetActiveSyncsHandler } from './modules/bank-feed-sync/application/queries/get-active-syncs.query';
import { GetPendingTransactionsHandler } from './modules/bank-feed-sync/application/queries/get-pending-transactions.query';
import { GetBankTransactionHandler } from './modules/bank-feed-sync/application/queries/get-bank-transaction.query';
import { GetTransactionsByConnectionHandler } from './modules/bank-feed-sync/application/queries/get-transactions-by-connection.query';

// Controllers
import { BankConnectionController } from './modules/bank-feed-sync/infrastructure/http/controllers/bank-connection.controller';
import { TransactionSyncController } from './modules/bank-feed-sync/infrastructure/http/controllers/transaction-sync.controller';
import { BankTransactionController } from './modules/bank-feed-sync/infrastructure/http/controllers/bank-transaction.controller';

class OutboxEventHandler implements DomainEventHandler {
  constructor(
    public readonly eventType: string,
    private readonly prisma: PrismaClient
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.prisma.outboxEvent.create({
        data: {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.getPayload() as any,
          status: 'PENDING',
        },
      });
    } catch (err) {
      console.error(`[OutboxEventHandler] Failed to persist event ${event.eventType} to outbox:`, err);
    }
  }
}

export class Container {
  private static instance: Container;
  private services: Map<string, unknown> = new Map();

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register(prisma: PrismaClient): void {
    const eventBus = getEventBus() as InMemoryEventBus;

    // Register outbox event listeners to intercept domain events and write them to outbox
    const eventsToOutbox = [
      'BankConnected',
      'BankDisconnected',
      'BankConnectionTokenUpdated',
      'BankConnectionDeleted',
      'SyncSessionStarted',
      'SyncSessionCompleted',
      'SyncSessionFailed',
      'BankTransactionsSynced',
      'BankTransactionProcessed',
    ];

    for (const eventName of eventsToOutbox) {
      eventBus.subscribe(eventName, new OutboxEventHandler(eventName, prisma));
    }

    // Repositories
    const bankConnectionRepository = new PrismaBankConnectionRepository(prisma, eventBus);
    const syncSessionRepository = new PrismaSyncSessionRepository(prisma, eventBus);
    const bankTransactionRepository = new PrismaBankTransactionRepository(prisma, eventBus);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

    this.services.set('bankConnectionRepository', bankConnectionRepository);
    this.services.set('syncSessionRepository', syncSessionRepository);
    this.services.set('bankTransactionRepository', bankTransactionRepository);
    this.services.set('outboxEventRepository', outboxEventRepository);
    this.services.set('prisma', prisma);

    // Stub Bank API Client
    const stubBankAPIClient = {
      async fetchTransactions(
        _accessToken: string,
        _fromDate: Date,
        _toDate: Date
      ) {
        return [];
      },
    };

    // Services
    const transactionSyncService = new TransactionSyncService(
      bankConnectionRepository,
      syncSessionRepository,
      bankTransactionRepository,
      stubBankAPIClient
    );

    this.services.set('transactionSyncService', transactionSyncService);

    // Command Handlers
    const connectBankHandler = new ConnectBankHandler(transactionSyncService);
    const disconnectBankHandler = new DisconnectBankHandler(transactionSyncService);
    const updateConnectionTokenHandler = new UpdateConnectionTokenHandler(transactionSyncService);
    const deleteConnectionHandler = new DeleteConnectionHandler(transactionSyncService);
    const syncTransactionsHandler = new SyncTransactionsHandler(transactionSyncService);
    const processTransactionHandler = new ProcessTransactionHandler(transactionSyncService);

    // Query Handlers
    const getBankConnectionsHandler = new GetBankConnectionsHandler(transactionSyncService);
    const getBankConnectionHandler = new GetBankConnectionHandler(transactionSyncService);
    const getSyncHistoryHandler = new GetSyncHistoryHandler(transactionSyncService);
    const getSyncSessionHandler = new GetSyncSessionHandler(transactionSyncService);
    const getActiveSyncsHandler = new GetActiveSyncsHandler(transactionSyncService);
    const getPendingTransactionsHandler = new GetPendingTransactionsHandler(transactionSyncService);
    const getBankTransactionHandler = new GetBankTransactionHandler(transactionSyncService);
    const getTransactionsByConnectionHandler = new GetTransactionsByConnectionHandler(transactionSyncService);

    // Controllers
    const bankConnectionController = new BankConnectionController(
      connectBankHandler,
      disconnectBankHandler,
      updateConnectionTokenHandler,
      deleteConnectionHandler,
      getBankConnectionsHandler,
      getBankConnectionHandler
    );

    const transactionSyncController = new TransactionSyncController(
      syncTransactionsHandler,
      getSyncHistoryHandler,
      getSyncSessionHandler,
      getActiveSyncsHandler
    );

    const bankTransactionController = new BankTransactionController(
      processTransactionHandler,
      getPendingTransactionsHandler,
      getBankTransactionHandler,
      getTransactionsByConnectionHandler
    );

    this.services.set('bankConnectionController', bankConnectionController);
    this.services.set('transactionSyncController', transactionSyncController);
    this.services.set('bankTransactionController', bankTransactionController);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  getBankFeedServices() {
    return {
      bankConnectionController: this.get<BankConnectionController>('bankConnectionController'),
      transactionSyncController: this.get<TransactionSyncController>('transactionSyncController'),
      bankTransactionController: this.get<BankTransactionController>('bankTransactionController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
