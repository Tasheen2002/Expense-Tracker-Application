import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { BankConnection } from '../domain/entities/bank-connection.entity';
import { BankTransaction } from '../domain/entities/bank-transaction.entity';
import { SyncSession } from '../domain/entities/sync-session.entity';
import { IBankConnectionRepository } from '../domain/repositories/bank-connection.repository';
import { ISyncSessionRepository } from '../domain/repositories/sync-session.repository';
import { IBankTransactionRepository } from '../domain/repositories/bank-transaction.repository';
import { TransactionSyncService } from '../application/services/transaction-sync.service';
import { PrismaBankTransactionRepository } from '../infrastructure/persistence/bank-transaction.repository.impl';
import { PrismaBankConnectionRepository } from '../infrastructure/persistence/bank-connection.repository.impl';
import { PrismaSyncSessionRepository } from '../infrastructure/persistence/sync-session.repository.impl';
import { HttpBankAPIClient } from '../infrastructure/bank-api/http-bank-api.client';
import { HttpExpenseReferenceChecker } from '../infrastructure/expense-reference/http-expense-reference.checker';

const workspaceId = '123e4567-e89b-42d3-a456-426614174000';
const userId = '123e4567-e89b-42d3-a456-426614174001';

function connection(): BankConnection {
  const bank = BankConnection.create(
    WorkspaceId.fromString(workspaceId),
    UserId.fromString(userId),
    'institution',
    'Bank',
    'account',
    'Current account',
    'CHECKING',
    'USD',
    'token'
  );
  bank.activate();
  return bank;
}

describe('bank sync contract', () => {
  it('reports actual inserts and duplicates within the same provider batch', async () => {
    const bank = connection();
    const connectionRepository = {
      findById: vi.fn().mockResolvedValue(bank),
      save: vi.fn().mockResolvedValue(undefined),
      recordSyncSuccess: vi.fn().mockResolvedValue(true),
      recordSyncFailure: vi.fn().mockResolvedValue(true),
    } as unknown as IBankConnectionRepository;
    const sessionRepository = {
      expireStaleByConnection: vi.fn().mockResolvedValue(0),
      findActiveByConnection: vi.fn().mockResolvedValue(null),
      findLatestByConnection: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISyncSessionRepository;
    const saveBatch = vi.fn().mockResolvedValue(1);
    const commit = vi.fn(async (input: { finalize: (imported: number) => void; transactions: readonly BankTransaction[] }) => input.finalize(1));
    const transactionRepository = {
      findByExternalIds: vi.fn().mockResolvedValue(new Set<string>()),
      saveBatch,
    } as unknown as IBankTransactionRepository;
    const transaction = (externalId: string) => ({
      externalId,
      amount: '12.34',
      currency: 'USD',
      description: 'Purchase',
      transactionDate: new Date('2026-01-01T00:00:00.000Z'),
    });
    const service = new TransactionSyncService(
      connectionRepository,
      sessionRepository,
      transactionRepository,
      { fetchTransactions: vi.fn().mockResolvedValue([transaction('a'), transaction('a'), transaction('b')]) },
      { exists: vi.fn().mockResolvedValue(true) },
      { commit }
    );

    const result = await service.syncTransactions({
      workspaceId,
      connectionId: bank.id.getValue(),
    });

    expect(commit.mock.calls[0][0].transactions).toHaveLength(2);
    expect(saveBatch).not.toHaveBeenCalled();
    expect(result.transactionsFetched).toBe(3);
    expect(result.transactionsImported).toBe(1);
    expect(result.transactionsDuplicate).toBe(2);
  });

  it('rolls back a batch when its outbox insert fails', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    const transaction = BankTransaction.create(
      bank.workspaceId,
      bank.id,
      session.id,
      'external-1',
      12.34,
      'USD',
      'Purchase',
      new Date('2026-01-01T00:00:00.000Z')
    );
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: bank.id.getValue() }]),
      bankTransaction: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([{ id: transaction.id.getValue() }]),
      },
      outboxEvent: { createMany: vi.fn().mockRejectedValue(new Error('outbox unavailable')) },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankTransactionRepository(prisma, {} as never);

    await expect(repository.saveBatch([transaction], bank.version)).rejects.toThrow('outbox unavailable');
    expect(transaction.domainEvents).toHaveLength(1);
    expect(tx.bankTransaction.createMany).toHaveBeenCalledOnce();
    expect(tx.outboxEvent.createMany).toHaveBeenCalledOnce();
  });

  it('emits no event for a transaction skipped by the database', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    const transaction = BankTransaction.create(
      bank.workspaceId, bank.id, session.id, 'already-imported', 12.34,
      'USD', 'Purchase', new Date('2026-01-01T00:00:00.000Z')
    );
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: bank.id.getValue() }]),
      bankTransaction: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      outboxEvent: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankTransactionRepository(prisma, {} as never);

    expect(await repository.saveBatch([transaction], bank.version)).toBe(0);
    expect(tx.outboxEvent.createMany).not.toHaveBeenCalled();
  });

  it('rejects an import once its connection is inactive', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    const transaction = BankTransaction.create(
      bank.workspaceId, bank.id, session.id, 'late-import', '12.34',
      'USD', 'Purchase', new Date('2026-01-01T00:00:00.000Z')
    );
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      bankTransaction: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankTransactionRepository(prisma, {} as never);

    await expect(repository.saveBatch([transaction], bank.version)).rejects.toThrow('no longer active');
    expect(tx.bankTransaction.createMany).not.toHaveBeenCalled();
  });

  it('rejects an import after its sync session has expired', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    const transaction = BankTransaction.create(
      bank.workspaceId, bank.id, session.id, 'expired-import', '12.34',
      'USD', 'Purchase', new Date('2026-01-01T00:00:00.000Z')
    );
    const tx = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ id: bank.id.getValue() }])
        .mockResolvedValueOnce([]),
      bankTransaction: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankTransactionRepository(prisma, {} as never);

    await expect(repository.saveBatch([transaction], bank.version)).rejects.toThrow('session is no longer active');
    expect(tx.bankTransaction.createMany).not.toHaveBeenCalled();
  });

  it('rejects a second concurrent transaction decision', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    const transaction = BankTransaction.create(
      bank.workspaceId, bank.id, session.id, 'decision', '12.34',
      'USD', 'Purchase', new Date('2026-01-01T00:00:00.000Z')
    );
    transaction.markAsIgnored();
    const tx = {
      bankTransaction: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      outboxEvent: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankTransactionRepository(prisma, {} as never);

    await expect(repository.save(transaction)).rejects.toThrow('already processed');
    expect(tx.outboxEvent.createMany).not.toHaveBeenCalled();
  });

  it('does not link a bank transaction to an expense outside its workspace', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    const transaction = BankTransaction.create(
      bank.workspaceId, bank.id, session.id, 'candidate', '12.34',
      'USD', 'Purchase', new Date('2026-01-01T00:00:00.000Z')
    );
    const save = vi.fn();
    const checker = { exists: vi.fn().mockResolvedValue(false) };
    const service = new TransactionSyncService(
      {} as IBankConnectionRepository,
      {} as ISyncSessionRepository,
      { findById: vi.fn().mockResolvedValue(transaction), save } as unknown as IBankTransactionRepository,
      { fetchTransactions: vi.fn() },
      checker,
      { commit: vi.fn() }
    );

    await expect(service.processTransaction({
      workspaceId, transactionId: transaction.id.getValue(), action: 'match',
      actorId: userId,
      expenseId: '123e4567-e89b-42d3-a456-426614174002', authToken: 'Bearer token',
    })).rejects.toThrow('Expense not found in workspace');
    expect(checker.exists).toHaveBeenCalledWith({
      workspaceId,
      expenseId: '123e4567-e89b-42d3-a456-426614174002',
      actorId: userId,
      authorization: 'Bearer token',
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('scopes the expense lookup to the workspace and caller token', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const checker = new HttpExpenseReferenceChecker('http://localhost:3003', request);
    expect(await checker.exists({
      workspaceId,
      expenseId: '123e4567-e89b-42d3-a456-426614174002',
      actorId: userId,
      authorization: 'Bearer token',
    })).toBe(false);
    expect(String(request.mock.calls[0][0])).toContain(`/workspaces/${workspaceId}/expenses/`);
    expect(request.mock.calls[0][1].headers.authorization).toBe('Bearer token');
    expect(request.mock.calls[0][1].headers['x-user-id']).toBe(userId);
    expect(request.mock.calls[0][1].headers['x-workspace-id']).toBe(workspaceId);
  });

  it('does not overwrite a connection disconnected during sync', async () => {
    const bank = connection();
    bank.clearDomainEvents();
    bank.updateLastSync();
    const tx = {
      bankConnection: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      outboxEvent: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankConnectionRepository(prisma, {} as never);

    expect(await repository.recordSyncSuccess(bank)).toBe(false);
    expect(tx.bankConnection.updateMany.mock.calls[0][0].where.status).toBe('CONNECTED');
    expect(tx.outboxEvent.createMany).not.toHaveBeenCalled();
  });

  it('rejects a stale connection mutation', async () => {
    const bank = connection();
    bank.markPersisted(0);
    bank.disconnect();
    const tx = {
      bankConnection: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      outboxEvent: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankConnectionRepository(prisma, {} as never);

    await expect(repository.save(bank)).rejects.toThrow('changed concurrently');
    expect(tx.outboxEvent.createMany).not.toHaveBeenCalled();
    expect(tx.bankConnection.updateMany.mock.calls[0][0].where.version).toBe(0);
  });

  it('encrypts a bank token in the same transaction as its outbox events', async () => {
    const bank = connection();
    const tx = {
      bankConnection: { create: vi.fn().mockResolvedValue({ id: bank.id.getValue() }) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaBankConnectionRepository(prisma, {} as never);

    await repository.save(bank);
    const stored = tx.bankConnection.create.mock.calls[0][0].data.accessToken as string;
    expect(stored).toMatch(/^enc:v1:/);
    expect(stored).not.toBe('token');
    expect(tx.outboxEvent.createMany).toHaveBeenCalledOnce();
    expect(bank.domainEvents).toHaveLength(0);
  });

  it('expires a crashed sync and writes its failure event atomically', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    const tx = {
      syncSession: {
        findMany: vi.fn().mockResolvedValue([{
          id: session.id.getValue(),
          connection: { userId: bank.userId.getValue() },
        }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaSyncSessionRepository(prisma, {} as never);

    expect(await repository.expireStaleByConnection(
      bank.workspaceId, bank.id, new Date('2026-01-01T00:00:00.000Z')
    )).toBe(1);
    expect(tx.outboxEvent.create.mock.calls[0][0].data.eventType).toBe('SyncSessionFailed');
    expect(tx.outboxEvent.create.mock.calls[0][0].data.payload.userId).toBe(bank.userId.getValue());
  });

  it('cannot revive a sync after another worker has failed it', async () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    session.markPersisted();
    session.start();
    const tx = {
      syncSession: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      outboxEvent: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;
    const repository = new PrismaSyncSessionRepository(prisma, {} as never);

    await expect(repository.save(session)).rejects.toThrow('changed concurrently');
    expect(tx.outboxEvent.createMany).not.toHaveBeenCalled();
  });

  it('rejects more precision than the database can represent', () => {
    const bank = connection();
    const session = SyncSession.create(bank.workspaceId, bank.id);
    expect(() => BankTransaction.create(
      bank.workspaceId, bank.id, session.id, 'too-precise', 1.1234567,
      'USD', 'Purchase', new Date('2026-01-01T00:00:00.000Z')
    )).toThrow('at most six decimal places');
  });

  it('rejects provider misconfiguration instead of reporting an empty sync', async () => {
    const client = new HttpBankAPIClient('');
    await expect(client.fetchTransactions('token', new Date(), new Date())).rejects.toThrow(
      'BANK_FEED_PROVIDER_URL is not configured'
    );
  });

  it('maps a configured provider response', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      transactions: [{
        externalId: 'one', amount: '12.34', currency: 'USD', description: 'Purchase',
        transactionDate: '2026-01-01T00:00:00.000Z',
      }],
    }), { status: 200 }));
    const client = new HttpBankAPIClient('https://bank.example/api/transactions', request);

    const result = await client.fetchTransactions('secret', new Date('2026-01-01'), new Date('2026-01-02'));
    expect(result[0].amount).toBe('12.34');
    expect(result[0].transactionDate).toBeInstanceOf(Date);
    expect(request.mock.calls[0][1].headers.authorization).toBe('Bearer secret');
    expect(request.mock.calls[0][1].redirect).toBe('error');
  });

  it.each(['ftp://localhost/transactions', 'http://bank.example/transactions'])('rejects insecure provider URL %s', async (url) => {
    const request = vi.fn();
    const client = new HttpBankAPIClient(url, request);
    await expect(client.fetchTransactions('secret', new Date(), new Date())).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['1.1234567', 'NaN', '100000000000000'])('rejects unrepresentable provider amount %s', async (amount) => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transactions: [{
      externalId: 'one', amount, currency: 'USD', description: 'Purchase', transactionDate: '2026-01-01T00:00:00Z',
    }] }), { status: 200 }));
    await expect(new HttpBankAPIClient('https://bank.example/transactions', request)
      .fetchTransactions('secret', new Date(), new Date())).rejects.toMatchObject({ statusCode: 502 });
  });

  it.each([{}, { success: true, data: { expenseId: 'wrong', workspaceId } },
    { success: true, data: { expenseId: '123e4567-e89b-42d3-a456-426614174002', workspaceId: 'wrong' } }])(
    'rejects an invalid successful expense response', async (body) => {
      const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
      await expect(new HttpExpenseReferenceChecker('http://localhost:3003', request).exists({
        workspaceId, expenseId: '123e4567-e89b-42d3-a456-426614174002', actorId: userId, authorization: 'Bearer token',
      })).rejects.toMatchObject({ statusCode: 502 });
    }
  );

  it('accepts a confirmed expense in the requested workspace', async () => {
    const expenseId = '123e4567-e89b-42d3-a456-426614174002';
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { expenseId, workspaceId } }), { status: 200 }));
    expect(await new HttpExpenseReferenceChecker('http://localhost:3003', request).exists({
      workspaceId, expenseId, actorId: userId, authorization: 'Bearer token',
    })).toBe(true);
  });
});
