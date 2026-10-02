import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { BudgetAlertRepositoryImpl } from '../infrastructure/persistence/budget-alert.repository.impl';
import { BudgetAllocationRepositoryImpl } from '../infrastructure/persistence/budget-allocation.repository.impl';
import { SpendingLimitRepositoryImpl } from '../infrastructure/persistence/spending-limit.repository.impl';
import { BudgetRepositoryImpl } from '../infrastructure/persistence/budget.repository.impl';
import { AlertId } from '../domain/value-objects/alert-id';
import { AllocationId } from '../domain/value-objects/allocation-id';
import { BudgetId } from '../domain/value-objects/budget-id';
import { BudgetStatus } from '../domain/enums/budget-status';
import { InMemoryEventBus } from '@expense-tracker/core';
import { randomUUID } from 'node:crypto';

describe('Budget repository workspace contracts', () => {
  it('does not discard a status filter when active state is also requested', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const workspaceId = randomUUID();
    const prisma = { budget: { findMany, count } } as unknown as PrismaClient;
    const repository = new BudgetRepositoryImpl(prisma, new InMemoryEventBus());
    await repository.findByFilters({ workspaceId, status: BudgetStatus.ARCHIVED, isActive: true });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        workspaceId,
        status: BudgetStatus.ARCHIVED,
        AND: [{ status: BudgetStatus.ACTIVE }],
      }),
    }));
  });
  it('keeps the workspace filter when a budget ID is supplied for alerts', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { budgetAlert: { findMany, count } } as unknown as PrismaClient;
    const repository = new BudgetAlertRepositoryImpl(prisma);
    const workspaceId = randomUUID();
    const budgetId = randomUUID();

    await repository.findByFilters({ budgetId }, workspaceId);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { budget: { workspaceId }, budgetId },
    }));
    expect(count).toHaveBeenCalledWith({ where: { budget: { workspaceId }, budgetId } });
  });

  it('scopes alert and allocation ID lookups to the requested workspace', async () => {
    const alertFindFirst = vi.fn().mockResolvedValue(null);
    const allocationFindFirst = vi.fn().mockResolvedValue(null);
    const prisma = {
      budgetAlert: { findFirst: alertFindFirst },
      budgetAllocation: { findFirst: allocationFindFirst },
    } as unknown as PrismaClient;
    const workspaceId = randomUUID();
    const alertId = randomUUID();
    const allocationId = randomUUID();

    await new BudgetAlertRepositoryImpl(prisma).findById(AlertId.fromString(alertId), workspaceId);
    await new BudgetAllocationRepositoryImpl(prisma).findByIdInWorkspace(
      AllocationId.fromString(allocationId), workspaceId
    );

    expect(alertFindFirst).toHaveBeenCalledWith({
      where: { id: alertId, budget: { workspaceId } },
    });
    expect(allocationFindFirst).toHaveBeenCalledWith({
      where: { id: allocationId, budget: { workspaceId } },
    });
  });

  it('does not silently cap the set of applicable spending limits', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { spendingLimit: { findMany } } as unknown as PrismaClient;
    await new SpendingLimitRepositoryImpl(prisma, new InMemoryEventBus())
      .findApplicableLimits(randomUUID());
    expect(findMany.mock.calls[0][0]).not.toHaveProperty('take');
  });

  it('refuses a budget row lock without a transaction to hold it', async () => {
    const queryRaw = vi.fn();
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaClient;
    const repository = new BudgetRepositoryImpl(prisma, new InMemoryEventBus());
    await expect(repository.findByIdInternalWithLock(BudgetId.fromString(randomUUID())))
      .rejects.toThrow('A transaction is required');
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
