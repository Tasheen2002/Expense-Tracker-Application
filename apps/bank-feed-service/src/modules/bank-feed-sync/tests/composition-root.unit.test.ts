import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createCompositionRoot } from '../../../composition-root';

describe('bank-feed composition root', () => {
  it('isolates dependencies between app instances', () => {
    const prisma = {} as PrismaClient;
    const bankAPIClient = { fetchTransactions: vi.fn() };
    const expenseReferenceChecker = { exists: vi.fn() };

    const first = createCompositionRoot(prisma, { bankAPIClient, expenseReferenceChecker });
    const second = createCompositionRoot(prisma, { bankAPIClient, expenseReferenceChecker });

    expect(first).not.toBe(second);
    expect(first.bankConnectionController).not.toBe(second.bankConnectionController);
    expect(first.outboxEventRepository).not.toBe(second.outboxEventRepository);
    expect(Object.isFrozen(first)).toBe(true);
  });
});
