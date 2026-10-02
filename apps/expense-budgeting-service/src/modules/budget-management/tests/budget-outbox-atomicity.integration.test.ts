import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { randomUUID } from 'node:crypto';
import { Budget } from '../domain/entities/budget.entity';
import { SpendingLimit } from '../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../domain/enums/budget-period-type';
import { BudgetRepositoryImpl } from '../infrastructure/persistence/budget.repository.impl';
import { SpendingLimitRepositoryImpl } from '../infrastructure/persistence/spending-limit.repository.impl';
import { SpendingLimitService } from '../application/services/spending-limit.service';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

describe('Budget Management outbox atomicity', () => {
  const workspaceId = randomUUID();
  const userId = randomUUID();
  let prisma: PrismaClient;
  let budgetRepository: BudgetRepositoryImpl;
  let failingBudgetRepository: BudgetRepositoryImpl;
  let failingSpendingLimitRepository: SpendingLimitRepositoryImpl;
  let spendingLimitRepository: SpendingLimitRepositoryImpl;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    const eventBus = new InMemoryEventBus();
    budgetRepository = new BudgetRepositoryImpl(prisma, eventBus);
    spendingLimitRepository = new SpendingLimitRepositoryImpl(prisma, eventBus);

    const failingPrisma = prisma.$extends({
      query: {
        outboxEvent: {
          async createMany() {
            throw new Error('Simulated outbox write failure');
          },
        },
      },
    }) as unknown as PrismaClient;
    failingBudgetRepository = new BudgetRepositoryImpl(failingPrisma, eventBus);
    failingSpendingLimitRepository = new SpendingLimitRepositoryImpl(failingPrisma, eventBus);
  });

  afterAll(async () => {
    const budgetIds = await prisma.budget.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const limitIds = await prisma.spendingLimit.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    await prisma.outboxEvent.deleteMany({
      where: {
        aggregateId: {
          in: [...budgetIds.map((budget) => budget.id), ...limitIds.map((limit) => limit.id)],
        },
      },
    });
    await prisma.spendingLimit.deleteMany({ where: { workspaceId } });
    await prisma.budget.deleteMany({ where: { workspaceId } });
    await prisma.$disconnect();
  });

  const createBudget = (name: string) => Budget.create({
    workspaceId,
    name,
    totalAmount: 1000,
    currency: 'USD',
    periodType: BudgetPeriodType.MONTHLY,
    startDate: new Date(),
    createdBy: userId,
    isRecurring: false,
    rolloverUnused: false,
  });

  it('rolls back a budget create when its outbox insert fails', async () => {
    const budget = createBudget('Failed outbox budget');

    await expect(failingBudgetRepository.create(budget)).rejects.toThrow(
      'Simulated outbox write failure'
    );
    expect(await prisma.budget.findUnique({ where: { id: budget.id.getValue() } })).toBeNull();
  });

  it('rolls back a validated budget update when its outbox insert fails', async () => {
    const budget = createBudget('Validated outbox budget');
    await budgetRepository.create(budget);
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: budget.id.getValue() } })
    ).toBe(1);
    budget.updateTotalAmount(1200);

    await expect(
      failingBudgetRepository.saveWithAllocationValidation(budget)
    ).rejects.toThrow('Simulated outbox write failure');

    const stored = await prisma.budget.findUnique({ where: { id: budget.id.getValue() } });
    expect(Number(stored?.totalAmount)).toBe(1000);
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: budget.id.getValue() } })
    ).toBe(1);
  });

  it('rolls back a spending-limit create when its outbox insert fails', async () => {
    const limit = SpendingLimit.create({
      workspaceId,
      userId,
      limitAmount: 200,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
    });

    await expect(failingSpendingLimitRepository.create(limit)).rejects.toThrow(
      'Simulated outbox write failure'
    );
    expect(
      await prisma.spendingLimit.findUnique({ where: { id: limit.id.getValue() } })
    ).toBeNull();
  });

  it('rolls back a spending-limit deletion and its event when the delete fails', async () => {
    const limit = SpendingLimit.create({
      workspaceId,
      userId,
      limitAmount: 300,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
    });
    await spendingLimitRepository.create(limit);
    const outboxCountBefore = await prisma.outboxEvent.count({
      where: { aggregateId: limit.id.getValue() },
    });
    const service = new SpendingLimitService(
      spendingLimitRepository,
      new PrismaUnitOfWork(prisma)
    );
    const deleteSpy = vi.spyOn(spendingLimitRepository, 'delete').mockRejectedValueOnce(
      new Error('Simulated delete failure')
    );

    try {
      await expect(
        service.deleteSpendingLimit(limit.id.getValue(), workspaceId)
      ).rejects.toThrow('Simulated delete failure');
    } finally {
      deleteSpy.mockRestore();
    }

    expect(await prisma.spendingLimit.findUnique({ where: { id: limit.id.getValue() } })).not.toBeNull();
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: limit.id.getValue() } })
    ).toBe(outboxCountBefore);
  });

  it('does not recreate a budget from a stale entity after deletion', async () => {
    const budget = createBudget('Stale budget');
    await budgetRepository.create(budget);
    await budgetRepository.delete(budget.id, workspaceId);
    budget.updateName('Resurrected budget');

    await expect(budgetRepository.save(budget)).rejects.toThrow();
    expect(await prisma.budget.findUnique({ where: { id: budget.id.getValue() } })).toBeNull();
  });

  it('does not recreate a spending limit from a stale entity after deletion', async () => {
    const limit = SpendingLimit.create({
      workspaceId,
      limitAmount: 100,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
    });
    await spendingLimitRepository.create(limit);
    await spendingLimitRepository.delete(limit.id, workspaceId);
    limit.updateLimitAmount(200);

    await expect(spendingLimitRepository.save(limit)).rejects.toThrow();
    expect(await prisma.spendingLimit.findUnique({ where: { id: limit.id.getValue() } })).toBeNull();
  });
});
