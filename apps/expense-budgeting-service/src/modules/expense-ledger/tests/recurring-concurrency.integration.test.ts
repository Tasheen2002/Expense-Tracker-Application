import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaRecurringExpenseRepository } from '../infrastructure/persistence/recurring-expense.repository.impl';
import { ExpenseRepositoryImpl } from '../infrastructure/persistence/expense.repository.impl';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { ExpenseService } from '../application/services/expense.service';
import { RecurringExpenseService } from '../application/services/recurring-expense.service';
import { RecurrenceFrequency } from '../domain/enums/recurrence-frequency';
import { PaymentMethod } from '../domain/enums/payment-method';
import { Expense } from '../domain/entities/expense.entity';
import { ExpenseId } from '../domain/value-objects/expense-id';
import { Money } from '../domain/value-objects/money';
import { ExpenseDate } from '../domain/value-objects/expense-date';

describe('Recurring Expense PostgreSQL Concurrency & FOR UPDATE SKIP LOCKED Integration Tests', () => {
  let prisma: PrismaClient;
  let eventBus: InMemoryEventBus;
  let unitOfWork: PrismaUnitOfWork;
  let recurringRepo: PrismaRecurringExpenseRepository;
  let expenseRepo: ExpenseRepositoryImpl;
  let expenseService: ExpenseService;

  const testWorkspaceId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const testUserId = 'bbbbbbbb-2222-4222-8222-222222222222';

  const cleanup = async () => {
    try {
      await prisma.expense.deleteMany({
        where: { workspaceId: testWorkspaceId },
      });
      await prisma.recurringExpense.deleteMany({
        where: { workspaceId: testWorkspaceId },
      });
    } catch {
      // Ignore if table or rows do not exist yet
    }
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/expense_tracker_expense?schema=public',
        },
      },
    });

    await prisma.$connect();

    eventBus = new InMemoryEventBus();
    unitOfWork = new PrismaUnitOfWork(prisma);
    recurringRepo = new PrismaRecurringExpenseRepository(prisma, eventBus);
    expenseRepo = new ExpenseRepositoryImpl(prisma, eventBus);

    expenseService = new ExpenseService(expenseRepo);

    await cleanup();
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('proves that two concurrent worker processes cannot process the same recurring expense (FOR UPDATE SKIP LOCKED)', async () => {
    const worker1 = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);
    const worker2 = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    // Seed 1 active recurring expense that is due in the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const created = await worker1.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: pastDate,
      template: {
        title: 'Concurrent Server Subscription',
        amount: 99.99,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // Run both workers concurrently against PostgreSQL
    const [result1, result2] = await Promise.all([
      worker1.processDueExpenses(10, testWorkspaceId),
      worker2.processDueExpenses(10, testWorkspaceId),
    ]);

    // Exactly one worker must claim and process the occurrence; the other worker skips it
    const totalProcessed = result1 + result2;
    expect(totalProcessed).toBe(1);

    // Verify in PostgreSQL that exactly 1 occurrence expense was created
    const expenses = await prisma.expense.findMany({
      where: {
        workspaceId: testWorkspaceId,
        title: 'Concurrent Server Subscription',
      },
    });
    expect(expenses.length).toBe(1);
    expect(Number(expenses[0].amount)).toBe(99.99);

    // Verify that the schedule was advanced in PostgreSQL
    const updatedRecurring = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(updatedRecurring).not.toBeNull();
    expect(new Date(updatedRecurring!.nextRunDate).getTime()).toBeGreaterThan(Date.now());
  });

  it('exercises the PostgreSQL P2002 unique constraint conflict path when inserting duplicate occurrence in repository', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const duplicateId = 'cccccccc-3333-4333-8333-333333333333';
    await prisma.expense.create({
      data: {
        id: duplicateId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        title: 'Initial Occurrence',
        amount: 49.99,
        currency: 'USD',
        expenseDate: pastDate,
        paymentMethod: 'CREDIT_CARD',
        isReimbursable: false,
        status: 'DRAFT',
      },
    });

    const duplicateExpense = Expense.create({
      id: ExpenseId.fromString(duplicateId),
      workspaceId: testWorkspaceId,
      userId: testUserId,
      title: 'Conflicting Occurrence',
      amount: Money.create(49.99, 'USD'),
      expenseDate: ExpenseDate.create(pastDate),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: false,
    });

    // Directly executing repository save with duplicate ID exercises the real PostgreSQL P2002 conflict path
    await expect(expenseRepo.save(duplicateExpense)).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('idempotently advances schedule when recurring expense occurrence already exists', async () => {
    const worker = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const created = await worker.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: pastDate,
      template: {
        title: 'Duplicate Race Subscription',
        amount: 49.99,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // Manually pre-insert an expense occurrence with the exact deterministic ID
    // that RecurringExpenseService will generate for this recurring expense on pastDate
    const dateStr = pastDate.toISOString().slice(0, 10);
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256')
      .update(`recurring:${created.id}:${dateStr}`)
      .digest('hex');
    const occurrenceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

    await prisma.expense.create({
      data: {
        id: occurrenceId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        title: 'Pre-existing Occurrence',
        amount: 49.99,
        currency: 'USD',
        expenseDate: pastDate,
        paymentMethod: 'CREDIT_CARD',
        isReimbursable: false,
        status: 'DRAFT',
      },
    });

    // Worker detects existing occurrence via idempotency check and advances schedule without duplicating expense
    const processed = await worker.processDueExpenses(10, testWorkspaceId);
    expect(processed).toBe(1);

    // Schedule should be advanced despite pre-existing occurrence
    const updatedRecurring = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(new Date(updatedRecurring!.nextRunDate).getTime()).toBeGreaterThan(pastDate.getTime());
  });

  it('recovers from PostgreSQL P2002 conflict by rolling back and retrying in a fresh Unit of Work transaction', async () => {
    const worker = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const created = await worker.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: pastDate,
      template: {
        title: 'P2002 Rollback & Retry Subscription',
        amount: 49.99,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // Pre-insert an expense occurrence with the deterministic ID in PostgreSQL
    const dateStr = pastDate.toISOString().slice(0, 10);
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256')
      .update(`recurring:${created.id}:${dateStr}`)
      .digest('hex');
    const occurrenceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

    await prisma.expense.create({
      data: {
        id: occurrenceId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        title: 'Pre-existing Occurrence',
        amount: 49.99,
        currency: 'USD',
        expenseDate: pastDate,
        paymentMethod: 'CREDIT_CARD',
        isReimbursable: false,
        status: 'DRAFT',
      },
    });

    // Simulate a concurrent creation race: getExpenseById returns null once,
    // so createExpense executes against PostgreSQL and triggers a real PostgreSQL P2002.
    // The worker catches P2002, lets the aborted transaction roll back cleanly,
    // and retries advancing the schedule in a fresh Unit of Work transaction.
    const getExpenseByIdSpy = vi.spyOn(expenseService, 'getExpenseById').mockResolvedValueOnce(null);

    const processed = await worker.processDueExpenses(10, testWorkspaceId);
    expect(processed).toBe(1);

    expect(getExpenseByIdSpy).toHaveBeenCalled();

    // Verify schedule was successfully advanced in PostgreSQL after rollback and retry
    const updatedRecurring = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(new Date(updatedRecurring!.nextRunDate).getTime()).toBeGreaterThan(pastDate.getTime());
  });

  it('prevents double-processing and stale writes during two-worker conflict recovery using FOR UPDATE SKIP LOCKED', async () => {
    const worker1 = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);
    const worker2 = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const created = await worker1.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: pastDate,
      template: {
        title: 'Two-Worker Conflict Race',
        amount: 39.99,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // Pre-insert the occurrence expense with deterministic ID in PostgreSQL
    const dateStr = pastDate.toISOString().slice(0, 10);
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256')
      .update(`recurring:${created.id}:${dateStr}`)
      .digest('hex');
    const occurrenceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

    await prisma.expense.create({
      data: {
        id: occurrenceId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        title: 'Pre-existing Occurrence',
        amount: 39.99,
        currency: 'USD',
        expenseDate: pastDate,
        paymentMethod: 'CREDIT_CARD',
        isReimbursable: false,
        status: 'DRAFT',
      },
    });

    // Simulate Worker 1 missing the occurrence check and hitting P2002 conflict,
    // while Worker 2 concurrently competes for the same recurring row
    vi.spyOn(expenseService, 'getExpenseById').mockResolvedValueOnce(null);

    // Run both workers concurrently
    const [processed1, processed2] = await Promise.all([
      worker1.processDueExpenses(1, testWorkspaceId),
      worker2.processDueExpenses(1, testWorkspaceId),
    ]);

    // Exactly one worker must successfully process and advance the recurring expense
    expect(processed1 + processed2).toBe(1);

    // Ensure the occurrence expense was NOT duplicated in PostgreSQL
    const matchingExpenses = await prisma.expense.findMany({
      where: {
        workspaceId: testWorkspaceId,
        id: occurrenceId,
      },
    });
    expect(matchingExpenses.length).toBe(1);

    // Verify schedule was advanced to the future in PostgreSQL
    const updatedRecurring = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(new Date(updatedRecurring!.nextRunDate).getTime()).toBeGreaterThan(pastDate.getTime());
  });

  it('does not advance recurring schedule when conflicting occurrence cannot be verified in PostgreSQL', async () => {
    const worker = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 4);

    const created = await worker.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: pastDate,
      template: {
        title: 'Unverified Conflict Row',
        amount: 88.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // Simulate unique constraint conflict on creation, but getExpenseById cannot verify the occurrence
    vi.spyOn(expenseService, 'createExpense').mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    );
    vi.spyOn(expenseService, 'getExpenseById').mockResolvedValue(null);

    const processed = await worker.processDueExpenses(10, testWorkspaceId);
    expect(processed).toBe(0);

    // Verify schedule was NOT advanced in PostgreSQL
    const notAdvanced = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(notAdvanced).not.toBeNull();
    expect(new Date(notAdvanced!.nextRunDate).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('continues claiming remaining due rows in batch when a conflicted row is locked by another concurrent worker', async () => {
    const worker = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    const pastDate1 = new Date();
    pastDate1.setDate(pastDate1.getDate() - 5);
    const pastDate2 = new Date();
    pastDate2.setDate(pastDate2.getDate() - 2);

    const row1 = await worker.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: pastDate1,
      template: {
        title: 'Batch Row 1 Conflicted',
        amount: 10.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    const row2 = await worker.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: pastDate2,
      template: {
        title: 'Batch Row 2 Normal',
        amount: 20.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // When processing Row 1: createExpense fails with P2002, and claimById returns null
    // (simulating another worker concurrently claiming and advancing Row 1 into the future)
    vi.spyOn(expenseService, 'createExpense').mockImplementationOnce(async () => {
      throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    });
    vi.spyOn(recurringRepo, 'claimById').mockImplementationOnce(async () => {
      await prisma.recurringExpense.update({
        where: { id: row1.id },
        data: { nextRunDate: new Date(Date.now() + 86400000) },
      });
      return null;
    });

    // Worker attempts batch with limit 10: Row 1 was handled elsewhere, but Row 2 is claimed and processed!
    const processed = await worker.processDueExpenses(10, testWorkspaceId);
    expect(processed).toBe(1);

    // Verify Row 2 was processed and advanced in PostgreSQL
    const updatedRow2 = await prisma.recurringExpense.findUnique({
      where: { id: row2.id },
    });
    expect(new Date(updatedRow2!.nextRunDate).getTime()).toBeGreaterThan(Date.now());

    const row2Expense = await prisma.expense.findFirst({
      where: {
        workspaceId: testWorkspaceId,
        title: 'Batch Row 2 Normal',
      },
    });
    expect(row2Expense).not.toBeNull();
  });

  it('fails fast when claimNextDueExpense is called without raw SQL capability', async () => {
    const invalidClientRepo = new PrismaRecurringExpenseRepository({} as never, eventBus);

    await expect(
      invalidClientRepo.claimNextDueExpense(new Date(), testWorkspaceId)
    ).rejects.toThrow(/PrismaClient instance does not support \$queryRaw/);
  });

  it('persists consecutiveFailures and lastFailureReason in PostgreSQL across runs and auto-pauses after 3 failures', async () => {
    const worker = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const created = await worker.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.DAILY,
      interval: 1,
      startDate: pastDate,
      template: {
        title: 'Failing Recurring Template',
        amount: 25.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // Mock createExpense to fail with an unrecoverable validation error (400)
    vi.spyOn(expenseService, 'createExpense').mockRejectedValue(
      Object.assign(new Error('Invalid category or tag reference'), {
        statusCode: 400,
        name: 'ValidationError',
      })
    );

    // Run 1: Fails once (limit 1 to isolate Run 1)
    await worker.processDueExpenses(1, testWorkspaceId);

    // Verify Run 1 persisted in PostgreSQL
    let rowInDb = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(rowInDb).not.toBeNull();
    expect(rowInDb!.consecutiveFailures).toBe(1);
    expect(rowInDb!.lastFailureReason).toContain('Invalid category or tag reference');
    expect(rowInDb!.lastFailureAt).not.toBeNull();
    expect(rowInDb!.status).toBe('ACTIVE');

    // Fast-forward nextRunDate so it is due again for Run 2
    const run2Date = new Date(pastDate);
    run2Date.setDate(run2Date.getDate() + 1);
    await prisma.recurringExpense.update({
      where: { id: created.id },
      data: { nextRunDate: run2Date },
    });

    // Run 2: Fails second time
    await worker.processDueExpenses(1, testWorkspaceId);

    rowInDb = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(rowInDb!.consecutiveFailures).toBe(2);
    expect(rowInDb!.status).toBe('ACTIVE');

    // Fast-forward nextRunDate so it is due again for Run 3
    const run3Date = new Date(pastDate);
    run3Date.setDate(run3Date.getDate() + 2);
    await prisma.recurringExpense.update({
      where: { id: created.id },
      data: { nextRunDate: run3Date },
    });

    // Run 3: Fails third time -> Auto-pauses!
    await worker.processDueExpenses(1, testWorkspaceId);

    rowInDb = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(rowInDb!.consecutiveFailures).toBe(3);
    expect(rowInDb!.status).toBe('PAUSED');
  });

  it('resets consecutiveFailures to 0 and clears failure metadata in PostgreSQL upon a successful run', async () => {
    const worker = new RecurringExpenseService(recurringRepo, expenseService, unitOfWork);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const created = await worker.createRecurringExpense({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      frequency: RecurrenceFrequency.DAILY,
      interval: 1,
      startDate: pastDate,
      template: {
        title: 'Recovering Recurring Template',
        amount: 50.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: false,
      },
    });

    // Set failure state on row in PostgreSQL
    await prisma.recurringExpense.update({
      where: { id: created.id },
      data: {
        consecutiveFailures: 2,
        lastFailureReason: 'Previous error',
        lastFailureAt: new Date(),
        nextRunDate: pastDate,
      },
    });

    // Successful run: should process and clear failures
    const processed = await worker.processDueExpenses(1, testWorkspaceId);
    expect(processed).toBe(1);

    const rowInDb = await prisma.recurringExpense.findUnique({
      where: { id: created.id },
    });
    expect(rowInDb).not.toBeNull();
    expect(rowInDb!.consecutiveFailures).toBe(0);
    expect(rowInDb!.lastFailureReason).toBeNull();
    expect(rowInDb!.lastFailureAt).toBeNull();
    expect(rowInDb!.status).toBe('ACTIVE');
  });
});
