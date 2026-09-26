import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { ExpenseRepositoryImpl } from '../infrastructure/persistence/expense.repository.impl';
import { ExpenseSplitRepositoryImpl } from '../infrastructure/persistence/expense-split.repository.impl';
import { SplitSettlementRepositoryImpl } from '../infrastructure/persistence/split-settlement.repository.impl';
import { ExpenseSplitService } from '../application/services/expense-split.service';
import { SplitType } from '../domain/enums/split-type';
import { Money } from '../domain/value-objects/money';
import { SettlementId } from '../domain/value-objects/settlement-id';
import { InvalidSettlementAmountError } from '../domain/errors/split-expense.errors';

describe('Split Settlement PostgreSQL Concurrency & FOR UPDATE Integration Tests', () => {
  let prisma: PrismaClient;
  let eventBus: InMemoryEventBus;
  let unitOfWork: PrismaUnitOfWork;
  let expenseRepo: ExpenseRepositoryImpl;
  let splitRepo: ExpenseSplitRepositoryImpl;
  let settlementRepo: SplitSettlementRepositoryImpl;
  let splitService: ExpenseSplitService;

  const testWorkspaceId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const testCreditorId = 'bbbbbbbb-2222-4222-8222-222222222222';
  const testDebtorId = 'cccccccc-3333-4333-8333-333333333333';

  const cleanup = async () => {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "expense_ledger"."split_settlements" WHERE "split_id" IN (SELECT "id" FROM "expense_ledger"."expense_splits" WHERE "workspace_id" = '${testWorkspaceId}')`
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM "expense_ledger"."split_participants" WHERE "split_id" IN (SELECT "id" FROM "expense_ledger"."expense_splits" WHERE "workspace_id" = '${testWorkspaceId}')`
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM "expense_ledger"."expense_splits" WHERE "workspace_id" = '${testWorkspaceId}'`
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM "expense_ledger"."expenses" WHERE "workspace_id" = '${testWorkspaceId}'`
      );
    } catch {
      // Ignore if table or rows do not exist yet
    }
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://postgres:1234@localhost:5432/expense_tracker_expense?schema=public',
        },
      },
    });

    await prisma.$connect();

    eventBus = new InMemoryEventBus();
    unitOfWork = new PrismaUnitOfWork(prisma);
    expenseRepo = new ExpenseRepositoryImpl(prisma, eventBus);
    splitRepo = new ExpenseSplitRepositoryImpl(prisma, eventBus);
    settlementRepo = new SplitSettlementRepositoryImpl(prisma);

    splitService = new ExpenseSplitService(
      splitRepo,
      settlementRepo,
      expenseRepo,
      unitOfWork
    );

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

  /**
   * Helper to seed an expense and corresponding split settlement
   */
  async function seedExpenseAndSettlement(totalAmount: number, debtorShare: number) {
    const expense = await prisma.expense.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: testCreditorId,
        title: 'Team Outing Expense',
        amount: totalAmount,
        currency: 'USD',
        expenseDate: new Date(),
        status: 'APPROVED',
      },
    });

    const split = await splitService.createSplit({
      expenseId: expense.id,
      workspaceId: testWorkspaceId,
      userId: testCreditorId,
      totalAmount: Money.create(totalAmount, 'USD'),
      splitType: SplitType.EXACT,
      participants: [
        { userId: testCreditorId, shareAmount: totalAmount - debtorShare },
        { userId: testDebtorId, shareAmount: debtorShare },
      ],
    });

    const settlements = await prisma.splitSettlement.findMany({
      where: { splitId: split.id },
    });

    expect(settlements).toHaveLength(1);
    return { expense, split, settlement: settlements[0] };
  }

  it('proves two concurrent payments are serialized by PostgreSQL FOR UPDATE row locking without lost updates', async () => {
    const { settlement } = await seedExpenseAndSettlement(200, 100);

    // Two simultaneous payments of $40 and $60 against the $100 settlement
    const [p1, p2] = await Promise.all([
      splitService.recordPayment({
        settlementId: settlement.id,
        workspaceId: testWorkspaceId,
        userId: testDebtorId,
        amount: 40,
      }),
      splitService.recordPayment({
        settlementId: settlement.id,
        workspaceId: testWorkspaceId,
        userId: testDebtorId,
        amount: 60,
      }),
    ]);

    // Both payments must have completed and the final cumulative paid amount reached 100
    expect([Number(p1.paidAmount), Number(p2.paidAmount)]).toContain(100);

    // Verify row state in PostgreSQL database
    const settlementInDb = await prisma.splitSettlement.findUnique({
      where: { id: settlement.id },
    });

    expect(settlementInDb).not.toBeNull();
    expect(Number(settlementInDb!.paidAmount)).toBe(100.0);
    expect(settlementInDb!.status).toBe('SETTLED');
    expect(settlementInDb!.settledAt).not.toBeNull();

    // Verify participant is marked as paid
    const participantInDb = await prisma.splitParticipant.findFirst({
      where: {
        splitId: settlement.splitId,
        userId: testDebtorId,
      },
    });
    expect(participantInDb?.isPaid).toBe(true);
  });

  it('proves multiple concurrent partial payments accumulate without lost updates', async () => {
    const { settlement } = await seedExpenseAndSettlement(200, 100);

    // Three concurrent partial payments of $25 each
    const payments = await Promise.all([
      splitService.recordPayment({
        settlementId: settlement.id,
        workspaceId: testWorkspaceId,
        userId: testDebtorId,
        amount: 25,
      }),
      splitService.recordPayment({
        settlementId: settlement.id,
        workspaceId: testWorkspaceId,
        userId: testDebtorId,
        amount: 25,
      }),
      splitService.recordPayment({
        settlementId: settlement.id,
        workspaceId: testWorkspaceId,
        userId: testDebtorId,
        amount: 25,
      }),
    ]);

    expect(payments).toHaveLength(3);

    // Verify row state in PostgreSQL: exactly $75 paid (zero lost updates)
    const settlementInDb = await prisma.splitSettlement.findUnique({
      where: { id: settlement.id },
    });

    expect(settlementInDb).not.toBeNull();
    expect(Number(settlementInDb!.paidAmount)).toBe(75.0);
    expect(settlementInDb!.status).toBe('PARTIAL');
    expect(settlementInDb!.settledAt).toBeNull();
  });

  it('prevents over-settlement under concurrent race conditions via row-level serialization', async () => {
    // Debtor owes $50
    const { settlement } = await seedExpenseAndSettlement(100, 50);

    // Two concurrent payments of $40 each (total $80 exceeds $50 owed)
    const results = await Promise.allSettled([
      splitService.recordPayment({
        settlementId: settlement.id,
        workspaceId: testWorkspaceId,
        userId: testDebtorId,
        amount: 40,
      }),
      splitService.recordPayment({
        settlementId: settlement.id,
        workspaceId: testWorkspaceId,
        userId: testDebtorId,
        amount: 40,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one must succeed, and the second must be rejected with InvalidSettlementAmountError
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason).toBeInstanceOf(InvalidSettlementAmountError);

    // Verify row in PostgreSQL: paid amount is strictly $40.00, NEVER overpaid to $80.00
    const settlementInDb = await prisma.splitSettlement.findUnique({
      where: { id: settlement.id },
    });

    expect(settlementInDb).not.toBeNull();
    expect(Number(settlementInDb!.paidAmount)).toBe(40.0);
    expect(settlementInDb!.status).toBe('PARTIAL');
  });

  it('fails fast when findByIdForUpdate is called without raw SQL capability', async () => {
    const invalidClientRepo = new SplitSettlementRepositoryImpl({} as never);

    await expect(
      invalidClientRepo.findByIdForUpdate(
        SettlementId.fromString('11111111-1111-4111-8111-111111111111'),
        testWorkspaceId
      )
    ).rejects.toThrow(/findByIdForUpdate requires a Prisma client with \$queryRaw support/);
  });
});
