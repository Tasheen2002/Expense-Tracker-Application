import { PrismaClient } from './prisma-client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';
import { PrismaBankConnectionRepository } from './modules/bank-feed-sync/infrastructure/persistence/bank-connection.repository.impl';
import { PrismaSyncSessionRepository } from './modules/bank-feed-sync/infrastructure/persistence/sync-session.repository.impl';
import { PrismaSyncCompletionWriter } from './modules/bank-feed-sync/infrastructure/persistence/prisma-sync-completion.writer';
import { PrismaBankTransactionRepository } from './modules/bank-feed-sync/infrastructure/persistence/bank-transaction.repository.impl';
import {
  TransactionSyncService,
  IBankAPIClient,
  IExpenseReferenceChecker,
} from './modules/bank-feed-sync/application/services/transaction-sync.service';
import { HttpBankAPIClient } from './modules/bank-feed-sync/infrastructure/bank-api/http-bank-api.client';
import { HttpExpenseReferenceChecker } from './modules/bank-feed-sync/infrastructure/expense-reference/http-expense-reference.checker';
import { ConnectBankHandler } from './modules/bank-feed-sync/application/commands/connect-bank.command';
import { DisconnectBankHandler } from './modules/bank-feed-sync/application/commands/disconnect-bank.command';
import { UpdateConnectionTokenHandler } from './modules/bank-feed-sync/application/commands/update-connection-token.command';
import { DeleteConnectionHandler } from './modules/bank-feed-sync/application/commands/delete-connection.command';
import { SyncTransactionsHandler } from './modules/bank-feed-sync/application/commands/sync-transactions.command';
import { ProcessTransactionHandler } from './modules/bank-feed-sync/application/commands/process-transaction.command';
import { GetBankConnectionsHandler } from './modules/bank-feed-sync/application/queries/get-bank-connections.query';
import { GetBankConnectionHandler } from './modules/bank-feed-sync/application/queries/get-bank-connection.query';
import { GetSyncHistoryHandler } from './modules/bank-feed-sync/application/queries/get-sync-history.query';
import { GetSyncSessionHandler } from './modules/bank-feed-sync/application/queries/get-sync-session.query';
import { GetActiveSyncsHandler } from './modules/bank-feed-sync/application/queries/get-active-syncs.query';
import { GetPendingTransactionsHandler } from './modules/bank-feed-sync/application/queries/get-pending-transactions.query';
import { GetBankTransactionHandler } from './modules/bank-feed-sync/application/queries/get-bank-transaction.query';
import { GetTransactionsByConnectionHandler } from './modules/bank-feed-sync/application/queries/get-transactions-by-connection.query';
import { BankConnectionController } from './modules/bank-feed-sync/infrastructure/http/controllers/bank-connection.controller';
import { TransactionSyncController } from './modules/bank-feed-sync/infrastructure/http/controllers/transaction-sync.controller';
import { BankTransactionController } from './modules/bank-feed-sync/infrastructure/http/controllers/bank-transaction.controller';

export interface CompositionRootOptions {
  bankAPIClient?: IBankAPIClient;
  expenseReferenceChecker?: IExpenseReferenceChecker;
}

export interface CompositionRoot {
  readonly bankConnectionController: BankConnectionController;
  readonly transactionSyncController: TransactionSyncController;
  readonly bankTransactionController: BankTransactionController;
  readonly outboxEventRepository: PrismaOutboxEventRepository;
}

export function createCompositionRoot(
  prisma: PrismaClient,
  options: CompositionRootOptions = {}
): CompositionRoot {
  const eventBus = new InMemoryEventBus();
  const bankConnectionRepository = new PrismaBankConnectionRepository(prisma, eventBus);
  const syncSessionRepository = new PrismaSyncSessionRepository(prisma, eventBus);
  const bankTransactionRepository = new PrismaBankTransactionRepository(prisma, eventBus);
  const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

  const transactionSyncService = new TransactionSyncService(
    bankConnectionRepository,
    syncSessionRepository,
    bankTransactionRepository,
    options.bankAPIClient ?? new HttpBankAPIClient(),
    options.expenseReferenceChecker ?? new HttpExpenseReferenceChecker(),
    new PrismaSyncCompletionWriter(prisma, eventBus)
  );

  const bankConnectionController = new BankConnectionController(
    new ConnectBankHandler(transactionSyncService),
    new DisconnectBankHandler(transactionSyncService),
    new UpdateConnectionTokenHandler(transactionSyncService),
    new DeleteConnectionHandler(transactionSyncService),
    new GetBankConnectionsHandler(transactionSyncService),
    new GetBankConnectionHandler(transactionSyncService)
  );
  const transactionSyncController = new TransactionSyncController(
    new SyncTransactionsHandler(transactionSyncService),
    new GetSyncHistoryHandler(transactionSyncService),
    new GetSyncSessionHandler(transactionSyncService),
    new GetActiveSyncsHandler(transactionSyncService)
  );
  const bankTransactionController = new BankTransactionController(
    new ProcessTransactionHandler(transactionSyncService),
    new GetPendingTransactionsHandler(transactionSyncService),
    new GetBankTransactionHandler(transactionSyncService),
    new GetTransactionsByConnectionHandler(transactionSyncService)
  );

  return Object.freeze({
    bankConnectionController,
    transactionSyncController,
    bankTransactionController,
    outboxEventRepository,
  });
}
