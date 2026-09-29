import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { BudgetService } from '../application/services/budget.service';
import { BudgetExpirationWorker } from '../infrastructure/workers/budget-expiration.worker';

describe('budget expiration startup', () => {
  it('reconciles active workspaces before startup completes and reports failures', async () => {
    const workspaceId = '123e4567-e89b-42d3-a456-426614174000';
    const prisma = {
      budget: { findMany: vi.fn().mockResolvedValue([{ workspaceId }]) },
    } as unknown as PrismaClient;
    const budgets = {
      processExpiredBudgets: vi.fn().mockResolvedValue(0),
      reconcileActiveSpending: vi.fn().mockResolvedValue(1),
    } as unknown as BudgetService;
    const onError = vi.fn();
    const worker = new BudgetExpirationWorker(prisma, budgets, onError);

    try {
      await worker.start(1_000_000);
      expect(budgets.processExpiredBudgets).toHaveBeenCalledWith(workspaceId);
      expect(budgets.reconcileActiveSpending).toHaveBeenCalledWith(workspaceId);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      await worker.stop();
    }
  });
});
