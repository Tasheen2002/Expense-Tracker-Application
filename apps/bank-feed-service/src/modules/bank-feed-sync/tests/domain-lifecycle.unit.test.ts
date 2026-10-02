import { describe, expect, it } from 'vitest';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { BankConnection } from '../domain/entities/bank-connection.entity';
import { BankTransaction } from '../domain/entities/bank-transaction.entity';
import { SyncSession } from '../domain/entities/sync-session.entity';
import { ConnectionStatus } from '../domain/enums/connection-status.enum';
import { SyncStatus } from '../domain/enums/sync-status.enum';
import { TransactionStatus } from '../domain/enums/transaction-status.enum';

const workspaceId = WorkspaceId.fromString('123e4567-e89b-42d3-a456-426614174000');
const userId = UserId.fromString('123e4567-e89b-42d3-a456-426614174001');

function bank(): BankConnection {
  const connection = BankConnection.create(
    workspaceId, userId, 'bank', 'Bank', 'account', 'Checking', 'CHECKING', 'USD', 'secret'
  );
  connection.activate();
  return connection;
}

describe('bank-feed domain lifecycle', () => {
  it('requires a token and protects disconnected/deleted connections', () => {
    expect(() => BankConnection.create(
      workspaceId, userId, 'bank', 'Bank', 'account', 'Checking', 'CHECKING', 'USD', '  '
    )).toThrow('Valid, unexpired bank token');

    const connection = bank();
    connection.clearDomainEvents();
    connection.disconnect();
    expect(connection.status).toBe(ConnectionStatus.DISCONNECTED);
    expect(connection.accessTokenForSync).toBe('');
    expect(connection.domainEvents).toHaveLength(1);
    connection.disconnect();
    expect(connection.domainEvents).toHaveLength(1);
    connection.markAsDeleted();
    expect(connection.status).toBe(ConnectionStatus.DELETED);
    expect(() => connection.updateAccessToken('secret')).toThrow('Deleted connection');
  });

  it('only completes a running session with consistent counts', () => {
    const connection = bank();
    const session = SyncSession.create(workspaceId, connection.id);
    expect(() => session.complete(1, 1, 0)).toThrow('expected IN_PROGRESS');
    session.start();
    expect(() => session.start()).toThrow('expected PENDING');
    expect(() => session.complete(1, 2, 0)).toThrow('Invalid sync transaction counts');
    session.complete(2, 1, 1);
    expect(session.status).toBe(SyncStatus.COMPLETED);
    expect(() => session.fail('late failure', userId)).toThrow('Cannot fail sync session from COMPLETED');
  });

  it('includes the connection owner in a failed-sync notification event', () => {
    const connection = bank();
    const session = SyncSession.create(workspaceId, connection.id);
    session.start();
    session.fail('provider token expired', connection.userId);
    const failed = session.domainEvents.find((event) => event.eventType === 'SyncSessionFailed');
    expect(failed?.getPayload()).toMatchObject({
      workspaceId: workspaceId.getValue(),
      userId: userId.getValue(),
      connectionId: connection.id.getValue(),
    });
  });

  it('allows one terminal transaction action and validates the expense ID', () => {
    const connection = bank();
    const session = SyncSession.create(workspaceId, connection.id);
    const transaction = BankTransaction.create(
      workspaceId, connection.id, session.id, 'external', '12.34', 'USD',
      'Purchase', new Date('2026-01-01T00:00:00.000Z')
    );
    expect(() => transaction.markAsImported('bad-id')).toThrow('Valid expense ID');
    transaction.markAsIgnored();
    expect(transaction.status).toBe(TransactionStatus.IGNORED);
    expect(() => transaction.markAsIgnored()).toThrow('already IGNORED');
  });

  it('returns defensive copies of dates', () => {
    const connection = bank();
    const createdAt = connection.createdAt.getTime();
    connection.createdAt.setFullYear(2000);
    expect(connection.createdAt.getTime()).toBe(createdAt);
    const session = SyncSession.create(workspaceId, connection.id);
    const startedAt = session.startedAt.getTime();
    session.startedAt.setFullYear(2000);
    expect(session.startedAt.getTime()).toBe(startedAt);
  });

  it('isolates nested metadata and input dates from outside mutation', () => {
    const connection = bank();
    const metadata = { provider: { reference: 'original' } };
    const session = SyncSession.create(workspaceId, connection.id, metadata);
    const date = new Date('2026-01-01T00:00:00Z');
    const transaction = BankTransaction.create(workspaceId, connection.id, session.id, 'metadata', '12.34', 'USD',
      'Purchase', date, undefined, undefined, undefined, metadata);
    metadata.provider.reference = 'mutated';
    date.setFullYear(2000);
    (transaction.metadata!.provider as { reference: string }).reference = 'getter mutation';
    (session.metadata!.provider as { reference: string }).reference = 'getter mutation';
    expect(transaction.metadata).toEqual({ provider: { reference: 'original' } });
    expect(session.metadata).toEqual({ provider: { reference: 'original' } });
    expect(transaction.transactionDate.getUTCFullYear()).toBe(2026);
  });
});
