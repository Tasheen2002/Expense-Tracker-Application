import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async (request: any) => {
    request.workspaceMembership = {
      role: 'ADMIN',
      workspaceId: request.params.workspaceId || request.headers['x-workspace-id'] || '123e4567-e89b-12d3-a456-426614174000',
    };
  },
  authenticate: async () => {},
}));

vi.mock('@shared/middleware/rate-limiter.middleware', () => ({
  createRateLimiter: () => async () => {},
  RateLimitPresets: {
    writeOperations: { windowMs: 60000, maxRequests: 100 },
    auth: { windowMs: 60000, maxRequests: 100 },
    readOperations: { windowMs: 60000, maxRequests: 100 },
    api: { windowMs: 60000, maxRequests: 100 },
    exports: { windowMs: 60000, maxRequests: 100 },
  },
  userKeyGenerator: () => 'test-user',
  endpointKeyGenerator: () => 'test-endpoint',
  userOrIpKeyGenerator: () => 'test-user',
}));

vi.mock('@shared/middleware/role-authorization.middleware', () => ({
  requireRole: () => async () => {},
  RolePermissions: {
    OWNER_ONLY: async () => {},
    ADMIN_LEVEL: async () => {},
    MANAGER_LEVEL: async () => {},
    MEMBER_LEVEL: async () => {},
  },
  hasRole: () => true,
}));

import { createServer } from '../../../app';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { BudgetService } from '../application/services/budget.service';
import { BudgetRepositoryImpl } from '../infrastructure/persistence/budget.repository.impl';
import { BudgetAllocationRepositoryImpl } from '../infrastructure/persistence/budget-allocation.repository.impl';
import { BudgetAlertRepositoryImpl } from '../infrastructure/persistence/budget-alert.repository.impl';
import { BudgetPeriodType } from '../domain/enums/budget-period-type';
import { BudgetAllocationExceededError, BudgetAlreadyExistsError, AllocationAlreadyExistsError } from '../domain/errors/budget.errors';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { randomUUID } from 'crypto';
import { AllocationId } from '../domain/value-objects/allocation-id';
import { SpendingLimit } from '../domain/entities/spending-limit.entity';
import { SpendingLimitRepositoryImpl } from '../infrastructure/persistence/spending-limit.repository.impl';
import { InvalidBudgetDataError } from '../domain/errors/budget.errors';

describe('Budget Concurrency Integration Tests', () => {
  let server: FastifyInstance;
  let prisma: PrismaClient;
  let budgetService: BudgetService;
  let budgetRepo: BudgetRepositoryImpl;
  let allocationRepo: BudgetAllocationRepositoryImpl;

  const testWorkspaceId = randomUUID();
  const testUserId = randomUUID();

  beforeAll(async () => {
    server = await createServer();
    prisma = (server as any).prisma;

    const mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      publishAll: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    } as any;

    budgetRepo = new BudgetRepositoryImpl(prisma, mockEventBus);
    allocationRepo = new BudgetAllocationRepositoryImpl(prisma);
    const alertRepo = new BudgetAlertRepositoryImpl(prisma);
    const uow = new PrismaUnitOfWork(prisma);

    budgetService = new BudgetService(budgetRepo, allocationRepo, alertRepo, uow);

    await server.ready();
  });

  afterAll(async () => {
    // Cleanup any created data for this workspace
    await prisma.budgetAlert.deleteMany({
      where: { budget: { workspaceId: testWorkspaceId } },
    });
    await prisma.budgetAllocation.deleteMany({
      where: { budget: { workspaceId: testWorkspaceId } },
    });
    await prisma.budget.deleteMany({
      where: { workspaceId: testWorkspaceId },
    });
    await prisma.category.deleteMany({ where: { workspaceId: testWorkspaceId } });

    await server.close();
  });

  it('allows only one normalized budget name during concurrent creation', async () => {
    const base = {
      workspaceId: testWorkspaceId,
      totalAmount: 100,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
    };
    const results = await Promise.allSettled([
      budgetService.createBudget({ ...base, name: '  Concurrent Name  ' }),
      budgetService.createBudget({ ...base, name: 'Concurrent Name' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason)
      .toBeInstanceOf(BudgetAlreadyExistsError);
    expect(await prisma.budget.count({
      where: { workspaceId: testWorkspaceId, name: 'Concurrent Name' },
    })).toBe(1);
  });

  it('reports a category conflict when concurrent allocations use the same category', async () => {
    const budget = await budgetService.createBudget({
      workspaceId: testWorkspaceId, name: `Category race ${randomUUID()}`,
      totalAmount: 100, currency: 'USD', periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(), createdBy: testUserId,
    });
    const categoryId = randomUUID();
    await prisma.category.create({ data: {
      id: categoryId, workspaceId: testWorkspaceId, name: `Race category ${categoryId}`,
    } });
    const allocate = () => budgetService.addAllocation({
      budgetId: budget.budgetId, workspaceId: testWorkspaceId, userId: testUserId,
      categoryId, allocatedAmount: 10,
    });
    const results = await Promise.allSettled([allocate(), allocate()]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(AllocationAlreadyExistsError);
  });

  it('rejects a category from another workspace for allocations and spending limits', async () => {
    const foreignCategoryId = randomUUID();
    await prisma.category.create({ data: {
      id: foreignCategoryId, workspaceId: randomUUID(), name: `Foreign ${foreignCategoryId}`,
    } });
    try {
      const budget = await budgetService.createBudget({
        workspaceId: testWorkspaceId, name: `Category scope ${randomUUID()}`,
        totalAmount: 100, currency: 'USD', periodType: BudgetPeriodType.MONTHLY,
        startDate: new Date(), createdBy: testUserId,
      });
      await expect(budgetService.addAllocation({
        budgetId: budget.budgetId, workspaceId: testWorkspaceId, userId: testUserId,
        categoryId: foreignCategoryId, allocatedAmount: 10,
      })).rejects.toThrow(InvalidBudgetDataError);

      const limit = SpendingLimit.create({
        workspaceId: testWorkspaceId, categoryId: foreignCategoryId,
        limitAmount: 100, currency: 'USD', periodType: BudgetPeriodType.MONTHLY,
      });
      const limitRepo = new SpendingLimitRepositoryImpl(prisma, {
        publish: vi.fn(), publishAll: vi.fn(), subscribe: vi.fn(),
      } as any);
      await expect(limitRepo.create(limit)).rejects.toThrow(InvalidBudgetDataError);
    } finally {
      await prisma.category.delete({ where: { id: foreignCategoryId } });
    }
  });

  it('preserves both fields when independent budget edits run concurrently', async () => {
    const budget = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: `Original ${randomUUID()}`,
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
    });

    await Promise.all([
      budgetService.updateBudget(budget.budgetId, testWorkspaceId, testUserId, { name: 'Renamed Budget' }),
      budgetService.updateBudget(budget.budgetId, testWorkspaceId, testUserId, { totalAmount: 800 }),
    ]);

    const persisted = await prisma.budget.findUniqueOrThrow({ where: { id: budget.budgetId } });
    expect(persisted.name).toBe('Renamed Budget');
    expect(Number(persisted.totalAmount)).toBe(800);
  });

  it('does not reset spending when saving a stale allocation description', async () => {
    const budget = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: `Spending Preservation ${randomUUID()}`,
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
    });
    const allocation = await budgetService.addAllocation({
      budgetId: budget.budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      allocatedAmount: 500,
    });
    const stale = await allocationRepo.findById(AllocationId.fromString(allocation.allocationId));
    expect(stale).not.toBeNull();

    await budgetService.updateAllocationSpent(allocation.allocationId, 250);
    stale!.updateDescription('Updated description');
    await allocationRepo.save(stale!);

    const persisted = await prisma.budgetAllocation.findUniqueOrThrow({
      where: { id: allocation.allocationId },
    });
    expect(persisted.description).toBe('Updated description');
    expect(Number(persisted.spentAmount)).toBe(250);
  });

  it('does not recreate a deleted allocation from a stale entity', async () => {
    const budget = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: `Deleted Allocation ${randomUUID()}`,
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
    });
    const allocation = await budgetService.addAllocation({
      budgetId: budget.budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      allocatedAmount: 100,
    });
    const stale = await allocationRepo.findById(AllocationId.fromString(allocation.allocationId));
    await budgetService.deleteAllocation(
      allocation.allocationId, testWorkspaceId, testUserId, budget.budgetId
    );

    stale!.updateDescription('Too late');
    await expect(allocationRepo.save(stale!)).rejects.toThrow();
    expect(await prisma.budgetAllocation.count({ where: { id: allocation.allocationId } })).toBe(0);
  });

  it('prevents over-allocation when budget reduction races with concurrent allocation', async () => {
    // 1. Create a budget with $1000 total amount
    const budgetDTO = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: 'Race Condition Budget',
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
      isRecurring: false,
      rolloverUnused: false,
    });
    const budgetId = budgetDTO.budgetId;

    // 2. Add an initial allocation of $300 (leaving $700 unallocated)
    await budgetService.addAllocation({
      budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      categoryId: undefined,
      allocatedAmount: 300,
    });

    // 3. Simultaneously fire two competing operations:
    //    Worker A: Reduce budget total amount to $400 (requires allocated <= 400, which holds with 300)
    //    Worker B: Add allocation of $350 (would make total allocated = 650, which exceeds 400)
    const reduceBudgetPromise = budgetService.updateBudget(
      budgetId,
      testWorkspaceId,
      testUserId,
      { totalAmount: 400 }
    );

    const addAllocationPromise = budgetService.addAllocation({
      budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      categoryId: undefined,
      allocatedAmount: 350,
    });

    const results = await Promise.allSettled([
      reduceBudgetPromise,
      addAllocationPromise,
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Exactly one operation must succeed, and the other must be rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // The failure must be a BudgetAllocationExceededError
    expect(rejected[0].reason).toBeInstanceOf(BudgetAllocationExceededError);

    // 4. Verify authoritative state in the database:
    // Invariant: sum of allocations <= budget.totalAmount
    const dbBudget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { allocations: true },
    });

    expect(dbBudget).not.toBeNull();
    const totalAllocated = dbBudget!.allocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount),
      0
    );
    const finalBudgetTotal = Number(dbBudget!.totalAmount);

    expect(totalAllocated).toBeLessThanOrEqual(finalBudgetTotal);

    if (fulfilled[0] === (results[0] as any)) {
      // Worker A succeeded: budget total is 400, allocations sum to 300
      expect(finalBudgetTotal).toBe(400);
      expect(totalAllocated).toBe(300);
    } else {
      // Worker B succeeded: budget total is 1000, allocations sum to 650
      expect(finalBudgetTotal).toBe(1000);
      expect(totalAllocated).toBe(650);
    }
  });

  it('prevents multiple concurrent allocations from exceeding total budget amount', async () => {
    // 1. Create a budget of $1000
    const budgetDTO = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: 'Competing Allocations Budget',
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
      isRecurring: false,
      rolloverUnused: false,
    });
    const budgetId = budgetDTO.budgetId;

    // 2. Launch 8 concurrent allocation requests of $250 each (total requested = $2000)
    // Only 4 can succeed ($1000). The other 4 must fail.
    const concurrentRequests = Array.from({ length: 8 }, (_, i) =>
      budgetService.addAllocation({
        budgetId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        categoryId: undefined,
        allocatedAmount: 250,
        description: `Allocation worker ${i}`,
      })
    );

    const results = await Promise.allSettled(concurrentRequests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled.length).toBe(4);
    expect(rejected.length).toBe(4);

    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(BudgetAllocationExceededError);
    }

    // Verify database total allocations equal exactly 1000 and do not exceed budget
    const dbBudget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { allocations: true },
    });

    const totalAllocated = dbBudget!.allocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount),
      0
    );

    expect(totalAllocated).toBe(1000);
    expect(Number(dbBudget!.totalAmount)).toBe(1000);
    expect(totalAllocated).toBeLessThanOrEqual(Number(dbBudget!.totalAmount));
  });

  it('coordinates concurrent budget reduction with concurrent allocation update', async () => {
    // 1. Create budget of $1000
    const budgetDTO = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: 'Allocation Update Race Budget',
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
      isRecurring: false,
      rolloverUnused: false,
    });
    const budgetId = budgetDTO.budgetId;

    // 2. Add an allocation of $200
    const alloc = await budgetService.addAllocation({
      budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      categoryId: undefined,
      allocatedAmount: 200,
    });

    // 3. Worker A tries to reduce budget from 1000 to 300
    //    Worker B tries to increase existing allocation from 200 to 500 (sum would be 500 > 300)
    const workerA = budgetService.updateBudget(
      budgetId,
      testWorkspaceId,
      testUserId,
      { totalAmount: 300 }
    );

    const workerB = budgetService.updateAllocation(
      alloc.allocationId,
      testWorkspaceId,
      testUserId,
      { allocatedAmount: 500 },
      budgetId
    );

    const results = await Promise.allSettled([workerA, workerB]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toBeInstanceOf(BudgetAllocationExceededError);

    // Verify invariant in DB
    const dbBudget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { allocations: true },
    });

    const totalAllocated = dbBudget!.allocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount),
      0
    );

    expect(totalAllocated).toBeLessThanOrEqual(Number(dbBudget!.totalAmount));
  });

  it('rolls back allocation spending and alerts atomically when parent budget update fails in updateAllocationSpent', async () => {
    // 1. Create a budget
    const budgetDTO = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: 'Atomic Rollback Budget',
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
      isRecurring: false,
      rolloverUnused: false,
    });
    const budgetId = budgetDTO.budgetId;

    // 2. Add an allocation of 500 (initial spent = 0)
    const alloc = await budgetService.addAllocation({
      budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      categoryId: undefined,
      allocatedAmount: 500,
    });

    // 3. Spy on budgetRepo.save to simulate a database failure during parent budget update
    const saveSpy = vi.spyOn(budgetRepo, 'save').mockRejectedValueOnce(new Error('Simulated DB Crash'));

    // 4. Updating spent to 450 generates alerts (90% threshold) and triggers parent budget save
    await expect(
      budgetService.updateAllocationSpent(alloc.allocationId, 450)
    ).rejects.toThrow('Simulated DB Crash');

    // 5. Verify that because of the atomic UnitOfWork transaction,
    // the allocation spentAmount and alerts were completely rolled back in PostgreSQL!
    const dbAlloc = await prisma.budgetAllocation.findUnique({
      where: { id: alloc.allocationId },
    });
    expect(Number(dbAlloc!.spentAmount)).toBe(0);

    const alertsCount = await prisma.budgetAlert.count({
      where: { budgetId },
    });
    expect(alertsCount).toBe(0);

    saveSpy.mockRestore();
  });

  it('correctly marks parent budget as EXCEEDED when concurrent transactions update spending on different allocations', async () => {
    // 1. Create a budget with $1000 limit and activate it
    const budgetDTO = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: 'Concurrent Spending Budget',
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
      isRecurring: false,
      rolloverUnused: false,
    });
    const budgetId = budgetDTO.budgetId;

    await budgetService.activateBudget(budgetId, testWorkspaceId, testUserId);

    // 2. Create two allocations of $500 each under the same budget
    const alloc1 = await budgetService.addAllocation({
      budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      categoryId: undefined,
      allocatedAmount: 500,
    });

    const alloc2 = await budgetService.addAllocation({
      budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      categoryId: undefined,
      allocatedAmount: 500,
    });

    // 3. Fire two concurrent transactions updating spending on different allocations:
    //    Worker 1 updates Allocation 1 spent to 600
    //    Worker 2 updates Allocation 2 spent to 500
    //    Combined total spending = 1100, which exceeds parent budget limit (1000)
    const worker1 = budgetService.updateAllocationSpent(alloc1.allocationId, 600);
    const worker2 = budgetService.updateAllocationSpent(alloc2.allocationId, 500);

    const [res1, res2] = await Promise.all([worker1, worker2]);

    expect(Number(res1.spentAmount)).toBe(600);
    expect(Number(res2.spentAmount)).toBe(500);

    // 4. Verify in PostgreSQL that:
    //    - Both allocations have their spentAmount persisted
    //    - The parent budget was deterministically marked EXCEEDED under the row lock
    const dbBudget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { allocations: true },
    });

    expect(dbBudget).not.toBeNull();
    expect(dbBudget!.status).toBe('EXCEEDED');

    const totalSpent = dbBudget!.allocations.reduce(
      (sum, a) => sum + Number(a.spentAmount),
      0
    );
    expect(totalSpent).toBe(1100);
  });

  it('creates one alert when concurrent updates cross the same allocation threshold', async () => {
    const budget = await budgetService.createBudget({
      workspaceId: testWorkspaceId,
      name: `Concurrent Alert ${randomUUID()}`,
      totalAmount: 1000,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
      startDate: new Date(),
      createdBy: testUserId,
    });
    const allocation = await budgetService.addAllocation({
      budgetId: budget.budgetId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      categoryId: undefined,
      allocatedAmount: 100,
    });

    await Promise.all([
      budgetService.updateAllocationSpent(allocation.allocationId, 60),
      budgetService.updateAllocationSpent(allocation.allocationId, 60),
    ]);

    const alerts = await prisma.budgetAlert.findMany({
      where: { allocationId: allocation.allocationId },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('INFO');
  });
});
