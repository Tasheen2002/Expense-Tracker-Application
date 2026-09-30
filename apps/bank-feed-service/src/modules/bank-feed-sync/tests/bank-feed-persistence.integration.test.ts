import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { UserId, WorkspaceId } from '@core/domain/value-objects';
import { BankConnection } from '../domain/entities/bank-connection.entity';
import { BankTransaction } from '../domain/entities/bank-transaction.entity';
import { SyncSession } from '../domain/entities/sync-session.entity';
import { PrismaBankConnectionRepository } from '../infrastructure/persistence/bank-connection.repository.impl';
import { PrismaBankTransactionRepository } from '../infrastructure/persistence/bank-transaction.repository.impl';
import { PrismaSyncSessionRepository } from '../infrastructure/persistence/sync-session.repository.impl';
import { PrismaSyncCompletionWriter } from '../infrastructure/persistence/prisma-sync-completion.writer';
import { TransactionSyncService } from '../application/services/transaction-sync.service';

const isolatedDatabase = process.env.BANK_FEED_TEST_DATABASE_URL;
describe.skipIf(!isolatedDatabase || isolatedDatabase !== process.env.DATABASE_URL)(
  'bank-feed PostgreSQL invariants', () => {
    const prisma = new PrismaClient();
    const eventBus = new InMemoryEventBus();
    const connections = new PrismaBankConnectionRepository(prisma, eventBus);
    const sessions = new PrismaSyncSessionRepository(prisma, eventBus);
    const transactions = new PrismaBankTransactionRepository(prisma, eventBus);
    const workspaces: string[] = [];

    function newConnection(): BankConnection {
      const workspaceId = crypto.randomUUID();
      workspaces.push(workspaceId);
      const connection = BankConnection.create(
        WorkspaceId.fromString(workspaceId),
        UserId.fromString(crypto.randomUUID()),
        'integration-bank', 'Integration Bank', crypto.randomUUID(),
        'Checking', 'CHECKING', 'USD', 'test-token'
      );
      connection.activate();
      return connection;
    }

    afterEach(async () => {
      if (workspaces.length === 0) return;
      const workspaceIds = workspaces.splice(0);
      const connectionRows = await prisma.bankConnection.findMany({
        where: { workspaceId: { in: workspaceIds } }, select: { id: true },
      });
      const connectionIds = connectionRows.map((row) => row.id);
      const sessionRows = await prisma.syncSession.findMany({
        where: { workspaceId: { in: workspaceIds } }, select: { id: true },
      });
      const transactionRows = await prisma.bankTransaction.findMany({
        where: { workspaceId: { in: workspaceIds } }, select: { id: true },
      });
      await prisma.bankTransaction.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
      await prisma.syncSession.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
      await prisma.bankConnection.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: [
          ...connectionIds,
          ...sessionRows.map((row) => row.id),
          ...transactionRows.map((row) => row.id),
        ] } },
      });
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('allows only one active session for competing sync starts', async () => {
      const connection = newConnection();
      await connections.save(connection);
      const first = SyncSession.create(connection.workspaceId, connection.id);
      const second = SyncSession.create(connection.workspaceId, connection.id);

      const outcomes = await Promise.allSettled([sessions.save(first), sessions.save(second)]);
      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
      expect(await prisma.syncSession.count({
        where: { connectionId: connection.id.getValue(), status: 'PENDING' },
      })).toBe(1);
    });

    it('expires a stale session and permits a new one', async () => {
      const connection = newConnection();
      await connections.save(connection);
      const oldSession = SyncSession.create(connection.workspaceId, connection.id);
      await sessions.save(oldSession);
      await prisma.syncSession.update({
        where: { id: oldSession.id.getValue() },
        data: { startedAt: new Date(Date.now() - 60 * 60 * 1000) },
      });

      expect(await sessions.expireStaleByConnection(
        connection.workspaceId, connection.id, new Date(Date.now() - 30 * 60 * 1000)
      )).toBe(1);
      expect((await prisma.syncSession.findUniqueOrThrow({
        where: { id: oldSession.id.getValue() },
      })).status).toBe('FAILED');
      expect(await prisma.outboxEvent.count({
        where: { aggregateId: oldSession.id.getValue(), eventType: 'SyncSessionFailed' },
      })).toBe(1);

      await sessions.save(SyncSession.create(connection.workspaceId, connection.id));
    });

    it('rejects cross-workspace session references at the database boundary', async () => {
      const connection = newConnection();
      await connections.save(connection);
      const otherWorkspaceId = crypto.randomUUID();

      await expect(prisma.syncSession.create({
        data: {
          workspaceId: otherWorkspaceId,
          connectionId: connection.id.getValue(),
          status: 'PENDING',
          startedAt: new Date(),
        },
      })).rejects.toThrow();
      expect(await prisma.syncSession.count({ where: { connectionId: connection.id.getValue() } })).toBe(0);
    });

    it('lets only one competing transaction decision commit', async () => {
      const connection = newConnection();
      await connections.save(connection);
      const session = SyncSession.create(connection.workspaceId, connection.id);
      await sessions.save(session);
      session.start();
      await sessions.save(session);
      const transaction = BankTransaction.create(
        connection.workspaceId, connection.id, session.id, 'decision-1', '12.34',
        'USD', 'Purchase', new Date()
      );
      expect(await transactions.saveBatch([transaction], connection.version)).toBe(1);

      const first = await transactions.findById(transaction.id, connection.workspaceId);
      const second = await transactions.findById(transaction.id, connection.workspaceId);
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      first!.markAsIgnored();
      second!.markAsImported(crypto.randomUUID());
      const outcomes = await Promise.allSettled([transactions.save(first!), transactions.save(second!)]);

      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
      expect(await prisma.outboxEvent.count({
        where: { aggregateId: transaction.id.getValue() },
      })).toBe(2); // Synced plus one decision, never both decisions.
      expect(['IGNORED', 'IMPORTED']).toContain((await prisma.bankTransaction.findUniqueOrThrow({
        where: { id: transaction.id.getValue() },
      })).status);
    });

    it('orders a concurrent disconnect and transaction import without a late write', async () => {
      const connection = newConnection();
      await connections.save(connection);
      const session = SyncSession.create(connection.workspaceId, connection.id);
      await sessions.save(session);
      session.start();
      await sessions.save(session);
      const transaction = BankTransaction.create(
        connection.workspaceId, connection.id, session.id, 'disconnect-race', '8.50',
        'USD', 'Purchase', new Date()
      );
      const versionBeforeDisconnect = connection.version;
      connection.disconnect();

      const [disconnect, importResult] = await Promise.allSettled([
        connections.save(connection),
        transactions.saveBatch([transaction], versionBeforeDisconnect),
      ]);
      expect(disconnect.status).toBe('fulfilled');
      const stored = await prisma.bankTransaction.count({ where: { id: transaction.id.getValue() } });
      expect(stored).toBe(importResult.status === 'fulfilled' ? 1 : 0);
      expect((await prisma.bankConnection.findUniqueOrThrow({
        where: { id: connection.id.getValue() },
      })).status).toBe('DISCONNECTED');
      expect(await prisma.outboxEvent.count({
        where: { aggregateId: transaction.id.getValue() },
      })).toBe(stored);
    });

    it('rolls back a connection write when its outbox write fails', async () => {
      const connection = newConnection();
      class FailingOutboxRepository extends PrismaBankConnectionRepository {
        protected override async persistOutboxEvents(): Promise<void> {
          throw new Error('injected outbox failure');
        }
      }
      const failingRepository = new FailingOutboxRepository(prisma, eventBus);

      await expect(failingRepository.save(connection)).rejects.toThrow('injected outbox failure');
      expect(await prisma.bankConnection.count({ where: { id: connection.id.getValue() } })).toBe(0);
      expect(connection.domainEvents.length).toBeGreaterThan(0);
    });

    async function activeSync() {
      const connection = newConnection();
      await connections.save(connection);
      const session = SyncSession.create(connection.workspaceId, connection.id);
      await sessions.save(session);
      session.start();
      await sessions.save(session);
      const transaction = BankTransaction.create(connection.workspaceId, connection.id, session.id,
        'atomic-import', '12.34', 'USD', 'Purchase', new Date());
      return { connection, session, transaction };
    }

    it('commits imports, session completion, connection timestamp and events together', async () => {
      const { connection, session, transaction } = await activeSync();
      const writer = new PrismaSyncCompletionWriter(prisma, eventBus);
      await writer.commit({ connection, session, transactions: [transaction], finalize: (imported) => {
        session.complete(1, imported, 1 - imported);
        connection.updateLastSync();
      } });
      expect(await prisma.bankTransaction.count({ where: { id: transaction.id.getValue() } })).toBe(1);
      expect(await prisma.syncSession.findUniqueOrThrow({ where: { id: session.id.getValue() } })).toMatchObject({ status: 'COMPLETED', transactionsImported: 1 });
      expect((await connections.findById(connection.id, connection.workspaceId))?.lastSyncAt).toBeInstanceOf(Date);
      expect(await prisma.outboxEvent.count({ where: { aggregateId: session.id.getValue(), eventType: 'SyncSessionCompleted' } })).toBe(1);
      expect(connection.domainEvents).toHaveLength(0);
      expect(session.domainEvents).toHaveLength(0);
    });

    it('rolls back all completion writes when the outbox fails', async () => {
      const { connection, session, transaction } = await activeSync();
      class FailingWriter extends PrismaSyncCompletionWriter {
        protected override async persistOutboxEvents(): Promise<void> { throw new Error('completion outbox failure'); }
      }
      await expect(new FailingWriter(prisma, eventBus).commit({ connection, session, transactions: [transaction], finalize: (imported) => {
        session.complete(1, imported, 1 - imported);
        connection.updateLastSync();
      } })).rejects.toThrow('completion outbox failure');
      expect(await prisma.bankTransaction.count({ where: { id: transaction.id.getValue() } })).toBe(0);
      expect((await prisma.syncSession.findUniqueOrThrow({ where: { id: session.id.getValue() } })).status).toBe('IN_PROGRESS');
      expect((await prisma.bankConnection.findUniqueOrThrow({ where: { id: connection.id.getValue() } })).lastSyncAt).toBeNull();
      expect(await prisma.outboxEvent.count({ where: { aggregateId: session.id.getValue(), eventType: 'SyncSessionCompleted' } })).toBe(0);
    });

    it('fences empty sync completions after a concurrent disconnect', async () => {
      const { connection, session } = await activeSync();
      const disconnected = (await connections.findById(connection.id, connection.workspaceId))!;
      disconnected.disconnect();
      await connections.save(disconnected);
      await expect(new PrismaSyncCompletionWriter(prisma, eventBus).commit({ connection, session, transactions: [], finalize: () => {
        session.complete(0, 0, 0); connection.updateLastSync();
      } })).rejects.toThrow('changed during sync');
      expect((await prisma.syncSession.findUniqueOrThrow({ where: { id: session.id.getValue() } })).status).toBe('IN_PROGRESS');
    });

    it('records a safe failed session after completion rollback without importing rows', async () => {
      const connection = newConnection();
      await connections.save(connection);
      class FailingWriter extends PrismaSyncCompletionWriter {
        protected override async persistOutboxEvents(): Promise<void> { throw new Error('private database secret'); }
      }
      const service = new TransactionSyncService(connections, sessions, transactions, {
        fetchTransactions: async () => [{ externalId: 'rollback', amount: '12.34', currency: 'USD', description: 'Purchase', transactionDate: new Date() }],
      }, { exists: async () => true }, new FailingWriter(prisma, eventBus));
      await expect(service.syncTransactions({ workspaceId: connection.workspaceId.getValue(), connectionId: connection.id.getValue() })).rejects.toThrow('private database secret');
      const row = await prisma.syncSession.findFirstOrThrow({ where: { connectionId: connection.id.getValue() } });
      expect(row.status).toBe('FAILED');
      expect(row.errorMessage).toBe('Sync failed due to an internal error');
      expect(await prisma.bankTransaction.count({ where: { connectionId: connection.id.getValue() } })).toBe(0);
      expect(await prisma.outboxEvent.count({ where: { aggregateId: row.id, eventType: 'SyncSessionFailed' } })).toBe(1);
      expect(await prisma.outboxEvent.count({ where: { aggregateId: row.id, eventType: 'SyncSessionCompleted' } })).toBe(0);
    });

    it('enforces cooldown under the connection lock even after completion', async () => {
      const { connection, session } = await activeSync();
      await new PrismaSyncCompletionWriter(prisma, eventBus).commit({ connection, session, transactions: [], finalize: () => {
        session.complete(0, 0, 0); connection.updateLastSync();
      } });
      await expect(sessions.save(SyncSession.create(connection.workspaceId, connection.id))).rejects.toThrow();
      expect(await prisma.syncSession.count({ where: { connectionId: connection.id.getValue() } })).toBe(1);
    });

    it('clears stale expiry and errors when rotating a token without an expiry', async () => {
      const connection = newConnection();
      await connections.save(connection);
      await prisma.bankConnection.update({ where: { id: connection.id.getValue() }, data: {
        status: 'ERROR', tokenExpiresAt: new Date(Date.now() - 1000), errorMessage: 'expired',
      } });
      const expired = (await connections.findById(connection.id, connection.workspaceId))!;
      expired.updateAccessToken('fresh-token');
      await connections.save(expired);
      const row = await prisma.bankConnection.findUniqueOrThrow({ where: { id: connection.id.getValue() } });
      expect(row.tokenExpiresAt).toBeNull();
      expect(row.errorMessage).toBeNull();
      expect((await connections.findById(connection.id, connection.workspaceId))?.isActive()).toBe(true);
    });
  }
);
