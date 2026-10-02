import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { BudgetPlanRepositoryImpl } from '../infrastructure/persistence/budget-plan.repository.impl';
import { BudgetPlan } from '../domain/entities/budget-plan.entity';
import { PlanPeriod } from '../domain/value-objects/plan-period';
import { PeriodType } from '../domain/enums/period-type.enum';
import { PlanStatus } from '../domain/enums/plan-status.enum';
import {
  BudgetPlanConcurrencyConflictError,
  CannotDeleteActivePlanError,
  ValidationError,
} from '../domain/errors/budget-planning.errors';
import { BUDGET_PLAN_EVENTS } from '../domain/constants/planning.constants';

describe('BudgetPlan Real PostgreSQL Concurrency & OCC Integration Tests', () => {
  let prisma: PrismaClient;
  let eventBus: InMemoryEventBus;
  let repo: BudgetPlanRepositoryImpl;

  const TEST_WORKSPACE_ID = '99999999-9999-4999-8999-999999999999';
  const TEST_USER_ID = '88888888-8888-4888-8888-888888888888';

  const cleanup = async () => {
    try {
      await prisma.forecastItem.deleteMany({
        where: { workspaceId: TEST_WORKSPACE_ID },
      });
      await prisma.forecast.deleteMany({
        where: { workspaceId: TEST_WORKSPACE_ID },
      });
      await prisma.scenario.deleteMany({
        where: { workspaceId: TEST_WORKSPACE_ID },
      });
      await prisma.budgetPlan.deleteMany({
        where: { workspaceId: TEST_WORKSPACE_ID },
      });
      await prisma.outboxEvent.deleteMany({
        where: {
          aggregateType: 'BudgetPlan',
          payload: {
            path: ['workspaceId'],
            equals: TEST_WORKSPACE_ID,
          },
        },
      });
    } catch {
      // Best-effort cleanup
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

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`[BudgetPlan Concurrency Integration] PostgreSQL unavailable: ${errMsg}`);
    }

    eventBus = new InMemoryEventBus();
    repo = new BudgetPlanRepositoryImpl(prisma, eventBus);
    await cleanup();
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  const createTestPlan = (name = 'FY2026 Corporate Plan') => {
    const period = PlanPeriod.createDateOnly(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-12-31T00:00:00.000Z')
    );
    return BudgetPlan.create({
      workspaceId: WorkspaceId.fromString(TEST_WORKSPACE_ID),
      name,
      description: 'Annual corporate operating plan',
      periodType: PeriodType.YEARLY,
      period,
      createdBy: UserId.fromString(TEST_USER_ID),
    });
  };

  it('should initialize aggregate version to 1 in PostgreSQL upon initial creation', async () => {
    const plan = createTestPlan();
    expect(plan.version).toBe(1);

    await repo.save(plan);

    const fetched = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(fetched).not.toBeNull();
    expect(fetched!.version).toBe(1);
    expect(fetched!.name).toBe('FY2026 Corporate Plan');
    expect(fetched!.period.startDateOnly).toBe('2026-01-01');
    expect(fetched!.period.endDateOnly).toBe('2026-12-31');

    // Verify outbox event persisted to PostgreSQL
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        aggregateType: 'BudgetPlan',
        aggregateId: plan.id.getValue(),
        eventType: BUDGET_PLAN_EVENTS.PLAN_CREATED,
      },
    });
    expect(outboxEvents.length).toBeGreaterThanOrEqual(1);
    expect(outboxEvents[0].status).toBe('PENDING');
  });

  it('should increment aggregate version to 2 upon successful update in PostgreSQL', async () => {
    const plan = createTestPlan();
    await repo.save(plan);
    expect(plan.version).toBe(1);

    plan.updateDetails('FY2026 Updated Plan', 'Updated operating plan notes');
    await repo.save(plan);

    // Invariant: Entity synchronized to version 2
    expect(plan.version).toBe(2);

    // Invariant: PostgreSQL row updated to version 2
    const fetched = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(fetched).not.toBeNull();
    expect(fetched!.version).toBe(2);
    expect(fetched!.name).toBe('FY2026 Updated Plan');
    expect(fetched!.description).toBe('Updated operating plan notes');
  });

  it('should throw BudgetPlanConcurrencyConflictError when two concurrent updates race on the same version in PostgreSQL', async () => {
    const plan = createTestPlan();
    await repo.save(plan);
    expect(plan.version).toBe(1);

    // Two independent readers load the same aggregate at version 1
    const readerA = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    const readerB = await repo.findById(plan.id, TEST_WORKSPACE_ID);

    expect(readerA).not.toBeNull();
    expect(readerB).not.toBeNull();
    expect(readerA!.version).toBe(1);
    expect(readerB!.version).toBe(1);

    // Reader A updates and commits successfully
    readerA!.updateDetails('Plan Updated by Node A');
    await repo.save(readerA!);
    expect(readerA!.version).toBe(2);

    // Reader B attempts to commit using stale version 1
    readerB!.updateDetails('Plan Updated by Node B');
    await expect(repo.save(readerB!)).rejects.toThrow(BudgetPlanConcurrencyConflictError);

    // Reader B aggregate remains unsynchronized
    expect(readerB!.version).toBe(1);

    // In PostgreSQL: row contains winning Node A changes at version 2
    const finalRow = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(finalRow).not.toBeNull();
    expect(finalRow!.version).toBe(2);
    expect(finalRow!.name).toBe('Plan Updated by Node A');
  });

  it('should handle simultaneous concurrent saves via Promise.allSettled with exactly one winner', async () => {
    const plan = createTestPlan();
    await repo.save(plan);

    const reader1 = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    const reader2 = await repo.findById(plan.id, TEST_WORKSPACE_ID);

    reader1!.updateDetails('Concurrent Writer 1');
    reader2!.updateDetails('Concurrent Writer 2');

    const results = await Promise.allSettled([
      repo.save(reader1!),
      repo.save(reader2!),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one write succeeds; one fails with ConcurrencyConflictError
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      BudgetPlanConcurrencyConflictError
    );

    // Database is safely at version 2
    const inDb = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(inDb!.version).toBe(2);
    expect(['Concurrent Writer 1', 'Concurrent Writer 2']).toContain(inDb!.name);
  });

  it('should throw BudgetPlanConcurrencyConflictError if plan was updated before deletion', async () => {
    const plan = createTestPlan();
    await repo.save(plan);

    // Reader holds version 1
    const staleReader = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(staleReader!.version).toBe(1);

    // Concurrent writer updates plan to version 2
    const writer = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    writer!.updateDetails('Updated while delete was pending');
    await repo.save(writer!);

    // Attempting delete with stale version 1 fails
    await expect(
      repo.delete(staleReader!.id, TEST_WORKSPACE_ID, staleReader!)
    ).rejects.toThrow(BudgetPlanConcurrencyConflictError);

    // Plan must still exist in PostgreSQL
    const remaining = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(remaining).not.toBeNull();
    expect(remaining!.version).toBe(2);
  });

  it('should throw CannotDeleteActivePlanError if plan was activated before deletion', async () => {
    const plan = createTestPlan();
    await repo.save(plan);

    const staleDraftReader = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(staleDraftReader!.status).toBe(PlanStatus.DRAFT);

    // Concurrently activate plan
    const activator = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    activator!.updateStatus(PlanStatus.ACTIVE);
    await repo.save(activator!);

    // Attempting delete fails because status in PostgreSQL is ACTIVE
    await expect(
      repo.delete(staleDraftReader!.id, TEST_WORKSPACE_ID, staleDraftReader!)
    ).rejects.toThrow(CannotDeleteActivePlanError);

    // Plan must remain in PostgreSQL as ACTIVE
    const remaining = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(remaining).not.toBeNull();
    expect(remaining!.status).toBe(PlanStatus.ACTIVE);
  });

  it('should atomically delete DRAFT plan and emit outbox event to PostgreSQL', async () => {
    const plan = createTestPlan();
    await repo.save(plan);

    const draftPlan = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(draftPlan).not.toBeNull();

    draftPlan!.markAsDeleted();
    await repo.delete(draftPlan!.id, TEST_WORKSPACE_ID, draftPlan!);

    // Plan must be gone from PostgreSQL
    const inDb = await repo.findById(plan.id, TEST_WORKSPACE_ID);
    expect(inDb).toBeNull();

    // Outbox event budget_plan.deleted must exist in PostgreSQL
    const deletionEvents = await prisma.outboxEvent.findMany({
      where: {
        aggregateType: 'BudgetPlan',
        aggregateId: plan.id.getValue(),
        eventType: BUDGET_PLAN_EVENTS.PLAN_DELETED,
      },
    });
    expect(deletionEvents.length).toBeGreaterThanOrEqual(1);
    expect(deletionEvents[0].status).toBe('PENDING');
  });

  it('should reject deletion when workspaceId is missing or empty', async () => {
    const plan = createTestPlan();
    await repo.save(plan);

    await expect(repo.delete(plan.id, '')).rejects.toThrow(ValidationError);
    await expect(repo.delete(plan.id, '   ')).rejects.toThrow(ValidationError);
  });
});
