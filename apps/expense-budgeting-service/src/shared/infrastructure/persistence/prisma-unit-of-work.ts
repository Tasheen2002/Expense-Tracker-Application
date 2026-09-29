import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient } from '@prisma/client';

import { IUnitOfWork } from '../../application/ports/unit-of-work.port';

export type { IUnitOfWork };

interface TransactionContext {
  root: PrismaClient;
  client: Prisma.TransactionClient;
  postCommitHooks: Array<() => Promise<void>>;
  rollbackHooks: Array<() => void>;
}

export class PrismaUnitOfWork implements IUnitOfWork {
  private static readonly storage = new AsyncLocalStorage<TransactionContext>();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Retrieves the ambient transaction client if currently executing inside a UnitOfWork,
   * or falls back to the provided root PrismaClient.
   */
  static getClient(fallback: PrismaClient): PrismaClient | Prisma.TransactionClient {
    const store = PrismaUnitOfWork.storage.getStore();
    if (!store) return fallback;
    if (store.root !== fallback) {
      throw new Error('Cannot use a different PrismaClient inside an active unit of work');
    }
    return store.client;
  }

  /**
   * Checks if an ambient UnitOfWork transaction is currently active.
   */
  static isInTransaction(): boolean {
    return PrismaUnitOfWork.storage.getStore() !== undefined;
  }

  /**
   * Registers an action to run after the current UnitOfWork transaction commits.
   * If not in a transaction, the hook runs immediately.
   */
  static addPostCommitHook(hook: () => Promise<void>): void {
    const store = PrismaUnitOfWork.storage.getStore();
    if (store) {
      store.postCommitHooks.push(hook);
    }
  }

  static addRollbackHook(hook: () => void): void {
    PrismaUnitOfWork.storage.getStore()?.rollbackHooks.push(hook);
  }

  /**
   * Determines whether the given client is an active transaction client.
   */
  static isTransactionClient(
    client: PrismaClient | Prisma.TransactionClient
  ): client is Prisma.TransactionClient {
    const store = PrismaUnitOfWork.storage.getStore();
    return (store !== undefined && store.client === client) || !('$transaction' in client);
  }

  async execute<T>(work: () => Promise<T>): Promise<T> {
    const existing = PrismaUnitOfWork.storage.getStore();
    if (existing) {
      if (existing.root !== this.prisma) {
        throw new Error('Cannot nest units of work with different PrismaClient instances');
      }
      return await work();
    }

    const postCommitHooks: Array<() => Promise<void>> = [];
    const rollbackHooks: Array<() => void> = [];

    let result: T;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        return PrismaUnitOfWork.storage.run({ root: this.prisma, client: tx, postCommitHooks, rollbackHooks }, async () => {
          return await work();
        });
      });
    } catch (error) {
      for (const hook of rollbackHooks.reverse()) {
        try {
          hook();
        } catch (rollbackError) {
          console.error('Error executing rollback hook:', rollbackError);
        }
      }
      throw error;
    }

    // Outer transaction has committed successfully!
    // Execute all post-commit hooks (e.g. domain event publication)
    for (const hook of postCommitHooks) {
      try {
        await hook();
      } catch (error) {
        console.error('Error executing post-commit hook:', error);
      }
    }

    return result;
  }
}
