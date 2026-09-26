import { describe, it, expect, vi } from 'vitest';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { PrismaClient, Prisma } from '@prisma/client';

const createMockPrisma = (transactionFn: any): PrismaClient => {
  return { $transaction: transactionFn } as unknown as PrismaClient;
};

describe('PrismaUnitOfWork & Repository Ambient Context', () => {
  it('returns root Prisma client when outside of transaction context', () => {
    const rootPrisma = createMockPrisma(vi.fn());

    const client = PrismaUnitOfWork.getClient(rootPrisma);
    expect(client).toBe(rootPrisma);
    expect(PrismaUnitOfWork.isTransactionClient(client)).toBe(false);
  });

  it('binds transaction client to ambient context during execute() and restores afterwards', async () => {
    const mockTx = {
      expense: { create: vi.fn(), update: vi.fn() },
      expenseSplit: { create: vi.fn() },
    } as unknown as Prisma.TransactionClient;

    const rootPrisma = createMockPrisma(
      vi.fn(async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        return callback(mockTx);
      })
    );

    const uow = new PrismaUnitOfWork(rootPrisma);

    let observedClientInsideTx: PrismaClient | Prisma.TransactionClient | null = null;
    let isTxInside: boolean = false;

    const result = await uow.execute(async () => {
      observedClientInsideTx = PrismaUnitOfWork.getClient(rootPrisma);
      isTxInside = PrismaUnitOfWork.isTransactionClient(observedClientInsideTx);
      return 'success-result';
    });

    expect(result).toBe('success-result');
    expect(rootPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(observedClientInsideTx).toBe(mockTx);
    expect(isTxInside).toBe(true);

    // After transaction execution completes, ambient context is cleared
    const clientAfterTx = PrismaUnitOfWork.getClient(rootPrisma);
    expect(clientAfterTx).toBe(rootPrisma);
    expect(PrismaUnitOfWork.isTransactionClient(clientAfterTx)).toBe(false);
  });

  it('propagates transaction failure and cleans up context if work throws', async () => {
    const mockTx = {} as Prisma.TransactionClient;
    const rootPrisma = createMockPrisma(
      vi.fn(async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        return callback(mockTx);
      })
    );

    const uow = new PrismaUnitOfWork(rootPrisma);

    await expect(
      uow.execute(async () => {
        expect(PrismaUnitOfWork.getClient(rootPrisma)).toBe(mockTx);
        throw new Error('Database write failure inside transaction');
      })
    ).rejects.toThrow('Database write failure inside transaction');

    // Context must be restored
    expect(PrismaUnitOfWork.getClient(rootPrisma)).toBe(rootPrisma);
  });

  it('executes post-commit hooks ONLY AFTER transaction commits successfully', async () => {
    const mockTx = {} as Prisma.TransactionClient;
    const executionOrder: string[] = [];

    const rootPrisma = createMockPrisma(
      vi.fn(async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        executionOrder.push('transaction_start');
        const res = await callback(mockTx);
        executionOrder.push('transaction_commit');
        return res;
      })
    );

    const uow = new PrismaUnitOfWork(rootPrisma);

    await uow.execute(async () => {
      executionOrder.push('work_body');
      PrismaUnitOfWork.addPostCommitHook(async () => {
        executionOrder.push('post_commit_hook');
      });
    });

    expect(executionOrder).toEqual([
      'transaction_start',
      'work_body',
      'transaction_commit',
      'post_commit_hook',
    ]);
  });

  it('discards post-commit hooks and does NOT execute them if transaction rolls back', async () => {
    const mockTx = {} as Prisma.TransactionClient;
    const postCommitHook = vi.fn();

    const rootPrisma = createMockPrisma(
      vi.fn(async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        await callback(mockTx);
        throw new Error('Transaction commit failed');
      })
    );

    const uow = new PrismaUnitOfWork(rootPrisma);

    await expect(
      uow.execute(async () => {
        PrismaUnitOfWork.addPostCommitHook(postCommitHook);
      })
    ).rejects.toThrow('Transaction commit failed');

    // Hook must never have been called because transaction rolled back!
    expect(postCommitHook).not.toHaveBeenCalled();
  });
});
