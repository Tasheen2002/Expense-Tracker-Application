import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { ExpenseRepositoryImpl } from '../infrastructure/persistence/expense.repository.impl';
import { Expense } from '../domain/entities/expense.entity';
import { Money } from '../domain/value-objects/money';
import { ExpenseDate } from '../domain/value-objects/expense-date';
import { ExpenseStatus } from '../domain/enums/expense-status';
import { PaymentMethod } from '../domain/enums/payment-method';
import { ExpenseConcurrencyConflictError } from '../domain/errors/expense.errors';

const prisma = new PrismaClient();
const eventBus = new InMemoryEventBus();
const expenseRepo = new ExpenseRepositoryImpl(prisma, eventBus);

const WORKSPACE_ID = 'bbbbbbbb-1111-4111-8111-111111111111';
const USER_ID = 'cccccccc-1111-4111-8111-111111111111';

describe('Expense Aggregate Optimistic Concurrency Integration Tests', () => {
  beforeEach(async () => {
    // Clean up expenses for test workspace
    await prisma.expenseTag.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.attachment.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.expense.deleteMany({
      where: { workspaceId: WORKSPACE_ID },
    });
  });

  afterAll(async () => {
    await prisma.expenseTag.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.attachment.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.expense.deleteMany({
      where: { workspaceId: WORKSPACE_ID },
    });
    await prisma.$disconnect();
  });

  it('should initialize aggregate version to 1 upon creation', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Initial Expense',
      amount: Money.create(100, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });

    expect(expense.version).toBe(1);
    await expenseRepo.save(expense);

    const fetched = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(fetched).not.toBeNull();
    expect(fetched!.version).toBe(1);
  });

  it('should increment aggregate version to 2 upon successful update', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Initial Expense',
      amount: Money.create(100, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });

    await expenseRepo.save(expense);
    expect(expense.version).toBe(1);

    expense.updateTitle('Updated Title');
    await expenseRepo.update(expense);

    expect(expense.version).toBe(2);

    const fetched = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(fetched!.version).toBe(2);
    expect(fetched!.title).toBe('Updated Title');
  });

  it('should throw ExpenseConcurrencyConflictError when two concurrent updates race on the same version', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Concurrent Race Test',
      amount: Money.create(250, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: true,
    });

    await expenseRepo.save(expense);
    expect(expense.version).toBe(1);

    // Two separate readers read the same expense at version 1
    const readerA = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    const readerB = await expenseRepo.findById(expense.id, WORKSPACE_ID);

    expect(readerA!.version).toBe(1);
    expect(readerB!.version).toBe(1);

    // Reader A updates title and saves successfully
    readerA!.updateTitle('Title modified by A');
    await expenseRepo.update(readerA!);
    expect(readerA!.version).toBe(2);

    // Reader B attempts to update using stale version 1
    readerB!.updateTitle('Title modified by B');
    await expect(expenseRepo.update(readerB!)).rejects.toThrow(
      ExpenseConcurrencyConflictError
    );

    // Final state should reflect A's changes with version 2
    const finalState = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(finalState!.version).toBe(2);
    expect(finalState!.title).toBe('Title modified by A');
  });

  it('should prevent racing status transitions (approve vs reject) on the same expense', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Status Race Test',
      amount: Money.create(500, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      isReimbursable: true,
    });

    // Submit expense to enter SUBMITTED state
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    // Read simultaneously
    const readerApprove = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    const readerReject = await expenseRepo.findById(expense.id, WORKSPACE_ID);

    expect(readerApprove!.status).toBe(ExpenseStatus.SUBMITTED);
    expect(readerReject!.status).toBe(ExpenseStatus.SUBMITTED);
    expect(readerApprove!.version).toBe(1);
    expect(readerReject!.version).toBe(1);

    const approverId = 'dddddddd-1111-4111-8111-111111111111';
    const rejecterId = 'eeeeeeee-1111-4111-8111-111111111111';

    readerApprove!.approve(approverId);
    readerReject!.reject(rejecterId, 'Violates policy');

    // Simulate concurrent update execution
    const results = await Promise.allSettled([
      expenseRepo.update(readerApprove!),
      expenseRepo.update(readerReject!),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one write must succeed and exactly one must fail with ConcurrencyConflict
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const failureReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(failureReason).toBeInstanceOf(ExpenseConcurrencyConflictError);

    // Database must be at version 2 and contain only the winning outcome
    const finalDoc = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(finalDoc!.version).toBe(2);
    expect([ExpenseStatus.APPROVED, ExpenseStatus.REJECTED]).toContain(finalDoc!.status);
  });
});
