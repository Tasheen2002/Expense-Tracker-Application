import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../../app';
import { BudgetPeriodType } from '../domain/enums/budget-period-type';
import { PaymentMethod } from '../../expense-ledger/domain/enums/payment-method';
import { ExpenseStatus } from '../../expense-ledger/domain/enums/expense-status';
import { SpendingLimit } from '../domain/entities/spending-limit.entity';
import { SpendingLimitExceededError } from '../domain/errors/budget.errors';
import { SpendingLimitRepositoryImpl } from '../infrastructure/persistence/spending-limit.repository.impl';
import { SpendingLimitService } from '../application/services/spending-limit.service';
import { PrismaWorkspaceAccountingLock } from '../infrastructure/persistence/prisma-workspace-accounting-lock';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

describe('approved expenses and budget management', () => {
  let app: FastifyInstance;
  const workspaceId = randomUUID();
  const ownerId = randomUUID();
  const approverId = randomUUID();
  const categoryId = randomUUID();

  beforeAll(async () => {
    app = await createServer();
    await app.ready();
    await app.prisma.category.create({
      data: { id: categoryId, workspaceId, name: `Budget ${categoryId}` },
    });
  });

  afterAll(async () => {
    if (!app) return;
    await app.prisma.expense.deleteMany({ where: { workspaceId } });
    await app.prisma.budgetAlert.deleteMany({ where: { budget: { workspaceId } } });
    await app.prisma.budgetAllocation.deleteMany({ where: { budget: { workspaceId } } });
    await app.prisma.budget.deleteMany({ where: { workspaceId } });
    await app.prisma.spendingLimit.deleteMany({ where: { workspaceId } });
    await app.prisma.category.deleteMany({ where: { workspaceId } });
    await app.close();
  });

  it('counts approval once and rejects an approval over the applicable period limit atomically', async () => {
    const budgets = app.compositionRoot.budgetManagement.budgetService;
    const expenses = app.compositionRoot.expenseLedger.expenseService;
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const budget = await budgets.createBudget({
      workspaceId, createdBy: ownerId, name: 'Approved expense budget',
      totalAmount: 100, currency: 'USD', periodType: BudgetPeriodType.MONTHLY,
      startDate: start,
    });
    const allocation = await budgets.addAllocation({
      workspaceId, budgetId: budget.budgetId, userId: ownerId,
      categoryId, allocatedAmount: 50,
    });
    await budgets.activateBudget(budget.budgetId, workspaceId, ownerId);

    const limitRepository = new SpendingLimitRepositoryImpl(app.prisma, {
      publish: async () => {}, publishAll: async () => {}, subscribe: () => {},
    } as never);
    await limitRepository.create(SpendingLimit.create({
      workspaceId, userId: ownerId, categoryId, limitAmount: 60,
      currency: 'USD', periodType: BudgetPeriodType.MONTHLY,
    }));

    const createSubmitted = async (amount: number) => {
      const created = await expenses.createExpense({
        workspaceId, userId: ownerId, title: `Expense ${amount}`,
        amount, currency: 'USD', expenseDate: today, categoryId,
        paymentMethod: PaymentMethod.CASH, isReimbursable: false,
      });
      await expenses.submitExpense(created.expenseId, workspaceId, ownerId);
      return created.expenseId;
    };

    const firstId = await createSubmitted(40);
    await expenses.approveExpense(firstId, workspaceId, approverId);
    const firstAllocation = await app.prisma.budgetAllocation.findUniqueOrThrow({
      where: { id: allocation.allocationId },
    });
    expect(firstAllocation.spentAmount.toString()).toBe('40');
    const alerts = await budgets.getUnreadAlerts(workspaceId);
    expect(alerts.items).toHaveLength(1);
    await budgets.markAlertAsRead(alerts.items[0].id, workspaceId);
    expect((await budgets.getUnreadAlerts(workspaceId)).items).toHaveLength(0);

    const secondId = await createSubmitted(30);
    await expect(expenses.approveExpense(secondId, workspaceId, approverId))
      .rejects.toBeInstanceOf(SpendingLimitExceededError);
    expect((await app.prisma.expense.findUniqueOrThrow({ where: { id: secondId } })).status)
      .toBe(ExpenseStatus.SUBMITTED);
    expect((await app.prisma.budgetAllocation.findUniqueOrThrow({
      where: { id: allocation.allocationId },
    })).spentAmount.toString()).toBe('40');

    const [thirdId, fourthId] = await Promise.all([
      createSubmitted(15), createSubmitted(15),
    ]);
    const concurrent = await Promise.allSettled([
      expenses.approveExpense(thirdId, workspaceId, approverId),
      expenses.approveExpense(fourthId, workspaceId, approverId),
    ]);
    expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await app.prisma.budgetAllocation.findUniqueOrThrow({
      where: { id: allocation.allocationId },
    })).spentAmount.toString()).toBe('55');

    // A deployment can inherit stale persisted totals. Reconciliation must restore
    // the projection without creating a second approval.
    await app.prisma.budgetAllocation.update({
      where: { id: allocation.allocationId }, data: { spentAmount: 0 },
    });
    expect(await budgets.reconcileActiveSpending(workspaceId)).toBeGreaterThanOrEqual(1);
    expect((await app.prisma.budgetAllocation.findUniqueOrThrow({
      where: { id: allocation.allocationId },
    })).spentAmount.toString()).toBe('55');

    // Approval accounting remains serialized even without an applicable limit.
    await app.prisma.spendingLimit.deleteMany({ where: { workspaceId } });
    const [fifthId, sixthId] = await Promise.all([
      createSubmitted(10), createSubmitted(10),
    ]);
    const unrestricted = await Promise.allSettled([
      expenses.approveExpense(fifthId, workspaceId, approverId),
      expenses.approveExpense(sixthId, workspaceId, approverId),
    ]);
    expect(unrestricted.every((result) => result.status === 'fulfilled')).toBe(true);
    expect((await app.prisma.budgetAllocation.findUniqueOrThrow({
      where: { id: allocation.allocationId },
    })).spentAmount.toString()).toBe('75');
  });

  it('archives an expired recurring budget and creates its next period with unused balance', async () => {
    const budgets = app.compositionRoot.budgetManagement.budgetService;
    const today = new Date();
    const previousMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const old = await budgets.createBudget({
      workspaceId, createdBy: ownerId, name: 'Recurring budget', totalAmount: 100,
      currency: 'USD', periodType: BudgetPeriodType.MONTHLY,
      startDate: previousMonth, isRecurring: true, rolloverUnused: true,
    });
    await budgets.addAllocation({
      workspaceId, budgetId: old.budgetId, userId: ownerId,
      categoryId, allocatedAmount: 80,
    });
    await budgets.activateBudget(old.budgetId, workspaceId, ownerId);
    expect(await budgets.processExpiredBudgets(workspaceId)).toBeGreaterThanOrEqual(1);
    const rows = await app.prisma.budget.findMany({
      where: { workspaceId, name: { startsWith: 'Recurring budget' } },
      orderBy: { startDate: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe('ARCHIVED');
    expect(rows[1].status).toBe('ACTIVE');
    expect(rows[1].totalAmount.toString()).toBe('200');
    expect(await app.prisma.budgetAllocation.count({ where: { budgetId: rows[1].id } })).toBe(1);
    expect(await budgets.processExpiredBudgets(workspaceId)).toBe(0);
  });

  it('waits for in-flight workspace accounting before changing a spending limit', async () => {
    const repository = new SpendingLimitRepositoryImpl(app.prisma, {
      publish: async () => {}, publishAll: async () => {}, subscribe: () => {},
    } as never);
    const unitOfWork = new PrismaUnitOfWork(app.prisma);
    const accountingLock = new PrismaWorkspaceAccountingLock(app.prisma);
    const limits = new SpendingLimitService(repository, unitOfWork, accountingLock);
    const created = await limits.createSpendingLimit({
      workspaceId, userId: ownerId, categoryId, limitAmount: 100,
      currency: 'USD', periodType: BudgetPeriodType.MONTHLY,
    });
    let release!: () => void;
    let acquired!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const locked = new Promise<void>((resolve) => { acquired = resolve; });
    const holder = unitOfWork.execute(async () => {
      await accountingLock.acquire(workspaceId);
      acquired();
      await gate;
    });
    await locked;
    let completed = false;
    const update = limits.updateSpendingLimit(created.limitId, workspaceId, { limitAmount: 50 })
      .then(() => { completed = true; });
    try {
      await new Promise((resolve) => setTimeout(resolve, 75));
      expect(completed).toBe(false);
    } finally {
      release();
      await holder;
    }
    await update;
    expect((await app.prisma.spendingLimit.findUniqueOrThrow({
      where: { id: created.limitId },
    })).limitAmount.toString()).toBe('50');
  });
});
