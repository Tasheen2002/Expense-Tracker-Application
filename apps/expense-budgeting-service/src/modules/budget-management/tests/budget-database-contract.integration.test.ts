import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('budget-management database invariants', () => {
  const prisma = new PrismaClient();
  const workspaceId = randomUUID();
  const budgetId = randomUUID();
  const foreignCategoryId = randomUUID();
  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDate = new Date('2026-01-31T00:00:00.000Z');

  beforeAll(async () => {
    await prisma.budget.create({ data: {
      id: budgetId, workspaceId, name: `DB contract ${budgetId}`,
      totalAmount: 100, currency: 'USD', periodType: 'CUSTOM',
      startDate, endDate, createdBy: randomUUID(),
    } });
    await prisma.category.create({ data: {
      id: foreignCategoryId, workspaceId: randomUUID(), name: `Foreign ${foreignCategoryId}`,
    } });
  });

  afterAll(async () => {
    await prisma.budget.deleteMany({ where: { id: budgetId } });
    await prisma.category.deleteMany({ where: { id: foreignCategoryId } });
    await prisma.$disconnect();
  });

  it('rejects nonpositive budgets and reversed periods', async () => {
    const data = {
      workspaceId, currency: 'USD', periodType: 'CUSTOM' as const,
      startDate, endDate, createdBy: randomUUID(),
    };
    await expect(prisma.budget.create({ data: {
      ...data, name: `Zero ${randomUUID()}`, totalAmount: 0,
    } })).rejects.toThrow();
    await expect(prisma.budget.create({ data: {
      ...data, name: `Reversed ${randomUUID()}`, totalAmount: 100,
      startDate: endDate, endDate: startDate,
    } })).rejects.toThrow();
  });

  it('rejects invalid allocation money values', async () => {
    await expect(prisma.budgetAllocation.create({ data: {
      budgetId, allocatedAmount: 0,
    } })).rejects.toThrow();
    await expect(prisma.budgetAllocation.create({ data: {
      budgetId, allocatedAmount: 100, spentAmount: -1,
    } })).rejects.toThrow();
  });

  it('rejects invalid alert snapshots', async () => {
    await expect(prisma.budgetAlert.create({ data: {
      budgetId, level: 'INFO', threshold: 101, currentSpent: 1,
      allocatedAmount: 100, message: 'Invalid threshold',
    } })).rejects.toThrow();
    await expect(prisma.budgetAlert.create({ data: {
      budgetId, level: 'INFO', threshold: 50, currentSpent: -1,
      allocatedAmount: 100, message: 'Invalid spending',
    } })).rejects.toThrow();
  });

  it('rejects nonpositive spending limits', async () => {
    await expect(prisma.spendingLimit.create({ data: {
      workspaceId, limitAmount: 0, currency: 'USD', periodType: 'MONTHLY',
    } })).rejects.toThrow();
  });

  it('rejects cross-workspace category references even in direct database writes', async () => {
    await expect(prisma.budgetAllocation.create({ data: {
      budgetId, categoryId: foreignCategoryId, allocatedAmount: 10,
    } })).rejects.toThrow();
    await expect(prisma.spendingLimit.create({ data: {
      workspaceId, categoryId: foreignCategoryId, limitAmount: 10,
      currency: 'USD', periodType: 'MONTHLY',
    } })).rejects.toThrow();
  });
});
