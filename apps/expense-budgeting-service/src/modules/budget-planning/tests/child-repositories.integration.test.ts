import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { WorkspaceId, UserId, CategoryId } from '@core/domain/value-objects';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { BudgetPlanRepositoryImpl } from '../infrastructure/persistence/budget-plan.repository.impl';
import { ForecastRepositoryImpl } from '../infrastructure/persistence/forecast.repository.impl';
import { ScenarioRepositoryImpl } from '../infrastructure/persistence/scenario.repository.impl';
import { ForecastItemRepositoryImpl } from '../infrastructure/persistence/forecast-item.repository.impl';
import { BudgetPlan } from '../domain/entities/budget-plan.entity';
import { Forecast } from '../domain/entities/forecast.entity';
import { Scenario } from '../domain/entities/scenario.entity';
import { ForecastItem } from '../domain/entities/forecast-item.entity';
import { PlanId } from '../domain/value-objects/plan-id';
import { PlanPeriod } from '../domain/value-objects/plan-period';
import { ForecastAmount } from '../domain/value-objects/forecast-amount';
import { PeriodType } from '../domain/enums/period-type.enum';
import { ForecastType } from '../domain/enums/forecast-type.enum';
import {
  ValidationError,
  BudgetPlanNotFoundError,
  ForecastNotFoundError,
  ScenarioNotFoundError,
  ForecastItemNotFoundError,
} from '../domain/errors/budget-planning.errors';
import { randomUUID } from 'crypto';

describe('Budget Planning Child Repositories & Database Compound FK Integration Tests', () => {
  let prisma: PrismaClient;
  let eventBus: InMemoryEventBus;
  let unitOfWork: PrismaUnitOfWork;

  let planRepo: BudgetPlanRepositoryImpl;
  let forecastRepo: ForecastRepositoryImpl;
  let scenarioRepo: ScenarioRepositoryImpl;
  let forecastItemRepo: ForecastItemRepositoryImpl;

  const WS_A = '11111111-1111-4111-8111-111111111111';
  const WS_B = '22222222-2222-4222-8222-222222222222';
  const USER_ID = '33333333-3333-4333-8333-333333333333';
  const CATEGORY_ID = '44444444-4444-4444-8444-444444444444';

  const cleanup = async () => {
    try {
      await prisma.forecastItem.deleteMany({
        where: { workspaceId: { in: [WS_A, WS_B] } },
      });
      await prisma.forecast.deleteMany({
        where: { workspaceId: { in: [WS_A, WS_B] } },
      });
      await prisma.scenario.deleteMany({
        where: { workspaceId: { in: [WS_A, WS_B] } },
      });
      await prisma.budgetPlan.deleteMany({
        where: { workspaceId: { in: [WS_A, WS_B] } },
      });
      await prisma.outboxEvent.deleteMany({
        where: {
          aggregateType: 'BudgetPlan',
          payload: {
            path: ['workspaceId'],
            array_contains: [WS_A, WS_B],
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
      throw new Error(`[Child Repositories Integration] PostgreSQL unavailable: ${errMsg}`);
    }

    eventBus = new InMemoryEventBus();
    unitOfWork = new PrismaUnitOfWork(prisma);
    planRepo = new BudgetPlanRepositoryImpl(prisma, eventBus);
    forecastRepo = new ForecastRepositoryImpl(prisma);
    scenarioRepo = new ScenarioRepositoryImpl(prisma);
    forecastItemRepo = new ForecastItemRepositoryImpl(prisma);

    await cleanup();
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // Helpers
  const createPlanInDb = async (workspaceId: string, name = 'Test Plan') => {
    const period = PlanPeriod.createDateOnly(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-12-31T00:00:00.000Z')
    );
    const plan = BudgetPlan.create({
      workspaceId: WorkspaceId.fromString(workspaceId),
      name,
      description: 'Test plan description',
      periodType: PeriodType.YEARLY,
      period,
      createdBy: UserId.fromString(USER_ID),
    });
    await planRepo.save(plan);
    return plan;
  };

  const createForecastEntity = (workspaceId: string, planId: string, name = 'Q1 Forecast') => {
    return Forecast.create({
      workspaceId: WorkspaceId.fromString(workspaceId),
      planId: PlanId.fromString(planId),
      name,
      type: ForecastType.BASELINE,
    });
  };

  // ============================================================================
  // Finding 2: PostgreSQL Compound Foreign Key Enforcement
  // ============================================================================
  describe('PostgreSQL Database Engine Compound Foreign Key Constraints', () => {
    it('should reject Forecast referencing a BudgetPlan from a different workspace at the DB engine level', async () => {
      // Plan created in Workspace A
      const planInA = await createPlanInDb(WS_A, 'Plan in Workspace A');

      // Attempting to insert a Forecast pointing to Plan A with Workspace B
      const invalidForecastInsert = prisma.forecast.create({
        data: {
          id: randomUUID(),
          workspaceId: WS_B, // Mismatched workspace!
          planId: planInA.id.getValue(),
          name: 'Illegitimate Cross-Workspace Forecast',
          type: 'BASELINE',
          isActive: true,
        },
      });

      // PostgreSQL compound foreign key (planId, workspaceId) MUST reject this
      await expect(invalidForecastInsert).rejects.toThrow(
        expect.objectContaining({
          code: 'P2003', // Foreign key constraint failed
        })
      );
    });

    it('should reject Scenario referencing a BudgetPlan from a different workspace at the DB engine level', async () => {
      // Plan created in Workspace A
      const planInA = await createPlanInDb(WS_A, 'Plan in Workspace A');

      // Attempting to insert Scenario with Workspace B
      const invalidScenarioInsert = prisma.scenario.create({
        data: {
          id: randomUUID(),
          workspaceId: WS_B, // Mismatched workspace!
          planId: planInA.id.getValue(),
          name: 'Illegitimate Cross-Workspace Scenario',
          createdBy: USER_ID,
        },
      });

      await expect(invalidScenarioInsert).rejects.toThrow(
        expect.objectContaining({
          code: 'P2003',
        })
      );
    });

    it('should reject ForecastItem referencing a Forecast from a different workspace at the DB engine level', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in Workspace A');
      const forecastInA = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast in A');
      await forecastRepo.save(forecastInA);

      // Attempting to insert a ForecastItem pointing to Forecast A with Workspace B
      const invalidItemInsert = prisma.forecastItem.create({
        data: {
          id: randomUUID(),
          workspaceId: WS_B, // Mismatched workspace!
          forecastId: forecastInA.id.getValue(),
          categoryId: CATEGORY_ID,
          amount: new Prisma.Decimal(5000),
        },
      });

      await expect(invalidItemInsert).rejects.toThrow(
        expect.objectContaining({
          code: 'P2003',
        })
      );
    });

    it('should reject updating workspaceId on a child row that breaks the compound foreign key', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecastInA = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast in A');
      await forecastRepo.save(forecastInA);

      // Attempting direct raw update of workspaceId on child row
      const illegalUpdate = prisma.forecast.update({
        where: { id: forecastInA.id.getValue() },
        data: { workspaceId: WS_B },
      });

      await expect(illegalUpdate).rejects.toThrow(
        expect.objectContaining({
          code: 'P2003',
        })
      );
    });
  });

  // ============================================================================
  // Finding 1 & 3: Child Repository Tenant Scoping & Field Immutability
  // ============================================================================
  describe('Forecast Repository Tenant Scoping & Immutability', () => {
    it('should reject saving a Forecast when parent BudgetPlan belongs to another workspace', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecastInB = createForecastEntity(WS_B, planInA.id.getValue(), 'Forecast in B');

      await expect(forecastRepo.save(forecastInB)).rejects.toThrow(BudgetPlanNotFoundError);
    });

    it('should reject cross-workspace modification of an existing Forecast', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const planInB = await createPlanInDb(WS_B, 'Plan in B');
      const forecastInA = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast in A');
      await forecastRepo.save(forecastInA);

      // Create an entity with the same forecast ID but workspace B and plan B
      const fraudulentForecast = Forecast.fromPersistence({
        id: forecastInA.id.getValue(),
        workspaceId: WS_B,
        planId: planInB.id.getValue(),
        name: 'Hijacked Forecast',
        type: ForecastType.BASELINE,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(forecastRepo.save(fraudulentForecast)).rejects.toThrow(ValidationError);
      await expect(forecastRepo.save(fraudulentForecast)).rejects.toThrow(/Cannot update forecast belonging to another workspace/);
    });

    it('should preserve immutable identity fields (workspaceId, planId, createdAt) across updates', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecast = createForecastEntity(WS_A, planInA.id.getValue(), 'Original Forecast Name');
      await forecastRepo.save(forecast);

      const beforeUpdate = await prisma.forecast.findUnique({
        where: { id: forecast.id.getValue() },
      });
      expect(beforeUpdate).not.toBeNull();

      // Update mutable details on the domain entity
      forecast.updateName('New Forecast Name');
      await forecastRepo.save(forecast);

      const afterUpdate = await prisma.forecast.findUnique({
        where: { id: forecast.id.getValue() },
      });

      expect(afterUpdate!.name).toBe('New Forecast Name');
      expect(afterUpdate!.workspaceId).toBe(beforeUpdate!.workspaceId);
      expect(afterUpdate!.planId).toBe(beforeUpdate!.planId);
      expect(afterUpdate!.createdAt.toISOString()).toBe(beforeUpdate!.createdAt.toISOString());
    });

    it('should enforce workspace scoping on delete, throwing NotFoundError if wrong workspace is passed', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecast = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast in A');
      await forecastRepo.save(forecast);

      // Attempting to delete using Workspace B must fail
      await expect(forecastRepo.delete(forecast.id, WS_B)).rejects.toThrow(ForecastNotFoundError);

      // Verify row is still intact in DB
      const inDb = await prisma.forecast.findUnique({
        where: { id: forecast.id.getValue() },
      });
      expect(inDb).not.toBeNull();

      // Deleting with correct workspace succeeds
      await forecastRepo.delete(forecast.id, WS_A);
      const afterDelete = await prisma.forecast.findUnique({
        where: { id: forecast.id.getValue() },
      });
      expect(afterDelete).toBeNull();
    });

    it('should isolate queries strictly by workspaceId', async () => {
      const planA = await createPlanInDb(WS_A, 'Plan in A');
      const planB = await createPlanInDb(WS_B, 'Plan in B');

      const forecastA = createForecastEntity(WS_A, planA.id.getValue(), 'Operating Forecast');
      const forecastB = createForecastEntity(WS_B, planB.id.getValue(), 'Operating Forecast');

      await forecastRepo.save(forecastA);
      await forecastRepo.save(forecastB);

      // findByName scoped by workspaceId
      const foundInA = await forecastRepo.findByName(planA.id, 'Operating Forecast', WS_A);
      expect(foundInA).not.toBeNull();
      expect(foundInA!.id.getValue()).toBe(forecastA.id.getValue());

      const foundWrongWs = await forecastRepo.findByName(planA.id, 'Operating Forecast', WS_B);
      expect(foundWrongWs).toBeNull();

      // findByPlanId scoped by workspaceId
      const listA = await forecastRepo.findByPlanId(planA.id, WS_A);
      expect(listA.items.length).toBe(1);
      expect(listA.items[0].id.getValue()).toBe(forecastA.id.getValue());

      const listWrongWs = await forecastRepo.findByPlanId(planA.id, WS_B);
      expect(listWrongWs.items.length).toBe(0);
    });
  });

  describe('Scenario Repository Tenant Scoping & Immutability', () => {
    it('should reject saving a Scenario when parent BudgetPlan belongs to another workspace', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const scenarioInB = Scenario.create({
        workspaceId: WorkspaceId.fromString(WS_B),
        planId: planInA.id,
        name: 'Scenario in B',
        createdBy: UserId.fromString(USER_ID),
      });

      await expect(scenarioRepo.save(scenarioInB)).rejects.toThrow(BudgetPlanNotFoundError);
    });

    it('should preserve immutable identity fields (workspaceId, planId, createdAt) across updates', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const scenario = Scenario.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        planId: planInA.id,
        name: 'Initial Scenario',
        description: 'Initial description',
        assumptions: { inflation: 0.03 },
        createdBy: UserId.fromString(USER_ID),
      });
      await scenarioRepo.save(scenario);

      const beforeUpdate = await prisma.scenario.findUnique({
        where: { id: scenario.id.getValue() },
      });

      scenario.updateDetails({
        name: 'Updated Scenario',
        description: 'Updated description',
        assumptions: { inflation: 0.05 },
      });
      await scenarioRepo.save(scenario);

      const afterUpdate = await prisma.scenario.findUnique({
        where: { id: scenario.id.getValue() },
      });

      expect(afterUpdate!.name).toBe('Updated Scenario');
      expect(afterUpdate!.description).toBe('Updated description');
      expect(afterUpdate!.workspaceId).toBe(beforeUpdate!.workspaceId);
      expect(afterUpdate!.planId).toBe(beforeUpdate!.planId);
      expect(afterUpdate!.createdAt.toISOString()).toBe(beforeUpdate!.createdAt.toISOString());
    });

    it('should enforce workspace scoping on scenario delete', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const scenario = Scenario.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        planId: planInA.id,
        name: 'Scenario in A',
        createdBy: UserId.fromString(USER_ID),
      });
      await scenarioRepo.save(scenario);

      // Wrong workspace fails with ScenarioNotFoundError
      await expect(scenarioRepo.delete(scenario.id, WS_B)).rejects.toThrow(ScenarioNotFoundError);

      // Row still exists
      const inDb = await prisma.scenario.findUnique({
        where: { id: scenario.id.getValue() },
      });
      expect(inDb).not.toBeNull();

      // Correct workspace succeeds
      await scenarioRepo.delete(scenario.id, WS_A);
      const afterDelete = await prisma.scenario.findUnique({
        where: { id: scenario.id.getValue() },
      });
      expect(afterDelete).toBeNull();
    });
  });

  describe('ForecastItem Repository Tenant Scoping & Immutability', () => {
    it('should reject saving a ForecastItem when parent Forecast belongs to another workspace', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecastInA = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast in A');
      await forecastRepo.save(forecastInA);

      const itemInB = ForecastItem.create({
        workspaceId: WorkspaceId.fromString(WS_B),
        forecastId: forecastInA.id,
        categoryId: CategoryId.fromString(CATEGORY_ID),
        amount: ForecastAmount.create(1500),
      });

      await expect(forecastItemRepo.save(itemInB)).rejects.toThrow(ForecastNotFoundError);
    });

    it('should preserve immutable identity fields (workspaceId, forecastId, categoryId, createdAt)', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecastInA = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast in A');
      await forecastRepo.save(forecastInA);

      const item = ForecastItem.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        forecastId: forecastInA.id,
        categoryId: CategoryId.fromString(CATEGORY_ID),
        amount: ForecastAmount.create(2000),
        notes: 'Initial item note',
      });
      await forecastItemRepo.save(item);

      const beforeUpdate = await prisma.forecastItem.findUnique({
        where: { id: item.id.getValue() },
      });

      item.updateDetails(ForecastAmount.create(3500), 'Updated item note');
      await forecastItemRepo.save(item);

      const afterUpdate = await prisma.forecastItem.findUnique({
        where: { id: item.id.getValue() },
      });

      expect(afterUpdate!.amount.toNumber()).toBe(3500);
      expect(afterUpdate!.notes).toBe('Updated item note');
      expect(afterUpdate!.workspaceId).toBe(beforeUpdate!.workspaceId);
      expect(afterUpdate!.forecastId).toBe(beforeUpdate!.forecastId);
      expect(afterUpdate!.categoryId).toBe(beforeUpdate!.categoryId);
      expect(afterUpdate!.createdAt.toISOString()).toBe(beforeUpdate!.createdAt.toISOString());
    });

    it('should enforce workspace scoping on forecast item delete', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecastInA = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast in A');
      await forecastRepo.save(forecastInA);

      const item = ForecastItem.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        forecastId: forecastInA.id,
        categoryId: CategoryId.fromString(CATEGORY_ID),
        amount: ForecastAmount.create(1000),
      });
      await forecastItemRepo.save(item);

      // Wrong workspace fails
      await expect(forecastItemRepo.delete(item.id, WS_B)).rejects.toThrow(ForecastItemNotFoundError);

      const inDb = await prisma.forecastItem.findUnique({
        where: { id: item.id.getValue() },
      });
      expect(inDb).not.toBeNull();

      // Correct workspace succeeds
      await forecastItemRepo.delete(item.id, WS_A);
      const afterDelete = await prisma.forecastItem.findUnique({
        where: { id: item.id.getValue() },
      });
      expect(afterDelete).toBeNull();
    });
  });

  // ============================================================================
  // Finding 4: Atomic Rollback & Cascading Deletions
  // ============================================================================
  describe('Transactional Atomic Rollbacks & Cascades in PostgreSQL', () => {
    it('should atomically delete Forecast and all child items using deleteWithItems', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecast = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast to Delete');
      await forecastRepo.save(forecast);

      const item1 = ForecastItem.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        forecastId: forecast.id,
        categoryId: CategoryId.fromString(CATEGORY_ID),
        amount: ForecastAmount.create(1000),
      });
      const item2 = ForecastItem.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        forecastId: forecast.id,
        categoryId: CategoryId.fromString('55555555-5555-5555-8555-555555555555'),
        amount: ForecastAmount.create(2000),
      });
      await forecastItemRepo.save(item1);
      await forecastItemRepo.save(item2);

      // Verify 2 items in DB
      const itemsBefore = await prisma.forecastItem.count({
        where: { forecastId: forecast.id.getValue(), workspaceId: WS_A },
      });
      expect(itemsBefore).toBe(2);

      // Atomic delete
      await forecastRepo.deleteWithItems(forecast.id, WS_A);

      // Verify both forecast and items deleted from PostgreSQL
      const forecastAfter = await prisma.forecast.findUnique({
        where: { id: forecast.id.getValue() },
      });
      expect(forecastAfter).toBeNull();

      const itemsAfter = await prisma.forecastItem.count({
        where: { forecastId: forecast.id.getValue() },
      });
      expect(itemsAfter).toBe(0);
    });

    it('should completely roll back all child operations when a UnitOfWork transaction aborts', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecast = createForecastEntity(WS_A, planInA.id.getValue(), 'Tx Rollback Forecast');

      let failed = false;
      try {
        await unitOfWork.execute(async () => {
          await forecastRepo.save(forecast);

          const item = ForecastItem.create({
            workspaceId: WorkspaceId.fromString(WS_A),
            forecastId: forecast.id,
            categoryId: CategoryId.fromString(CATEGORY_ID),
            amount: ForecastAmount.create(4000),
          });
          await forecastItemRepo.save(item);

          // Force an intentional abort
          throw new Error('Simulated transactional failure');
        });
      } catch (err: any) {
        failed = true;
        expect(err.message).toBe('Simulated transactional failure');
      }

      expect(failed).toBe(true);

      // Verify neither the Forecast nor the ForecastItem exist in PostgreSQL!
      const forecastInDb = await prisma.forecast.findUnique({
        where: { id: forecast.id.getValue() },
      });
      expect(forecastInDb).toBeNull();

      const itemsInDb = await prisma.forecastItem.findMany({
        where: { forecastId: forecast.id.getValue() },
      });
      expect(itemsInDb).toHaveLength(0);
    });

    it('should cascade delete child forecasts, scenarios, and items when BudgetPlan is deleted', async () => {
      const plan = await createPlanInDb(WS_A, 'Parent Plan for Cascade Test');

      const forecast = createForecastEntity(WS_A, plan.id.getValue(), 'Child Forecast');
      await forecastRepo.save(forecast);

      const item = ForecastItem.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        forecastId: forecast.id,
        categoryId: CategoryId.fromString(CATEGORY_ID),
        amount: ForecastAmount.create(3000),
      });
      await forecastItemRepo.save(item);

      const scenario = Scenario.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        planId: plan.id,
        name: 'Child Scenario',
        createdBy: UserId.fromString(USER_ID),
      });
      await scenarioRepo.save(scenario);

      // Verify they all exist in PostgreSQL
      expect(await prisma.forecast.count({ where: { id: forecast.id.getValue() } })).toBe(1);
      expect(await prisma.forecastItem.count({ where: { id: item.id.getValue() } })).toBe(1);
      expect(await prisma.scenario.count({ where: { id: scenario.id.getValue() } })).toBe(1);

      // Delete parent BudgetPlan directly via Prisma to test DB-level onDelete: Cascade
      await prisma.budgetPlan.delete({
        where: { id: plan.id.getValue() },
      });

      // Assert PostgreSQL engine cascaded to all child entities
      expect(await prisma.forecast.count({ where: { id: forecast.id.getValue() } })).toBe(0);
      expect(await prisma.forecastItem.count({ where: { id: item.id.getValue() } })).toBe(0);
      expect(await prisma.scenario.count({ where: { id: scenario.id.getValue() } })).toBe(0);
    });

    it('should throw ForecastNotFoundError if child forecast disappears concurrently before updateMany in save', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecast = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast Concurrent Race');

      const mockPrismaForRace = {
        budgetPlan: {
          findFirst: vi.fn().mockResolvedValue({ id: planInA.id.getValue() }),
        },
        forecast: {
          findUnique: vi.fn().mockResolvedValue({
            id: forecast.id.getValue(),
            workspaceId: WS_A,
            planId: planInA.id.getValue(),
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      } as unknown as PrismaClient;

      const raceRepo = new ForecastRepositoryImpl(mockPrismaForRace);
      await expect(raceRepo.save(forecast)).rejects.toThrow(ForecastNotFoundError);
    });

    it('should throw ScenarioNotFoundError if child scenario disappears concurrently before updateMany in save', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const scenario = Scenario.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        planId: planInA.id,
        name: 'Scenario Concurrent Race',
        createdBy: UserId.fromString(USER_ID),
      });

      const mockPrismaForRace = {
        budgetPlan: {
          findFirst: vi.fn().mockResolvedValue({ id: planInA.id.getValue() }),
        },
        scenario: {
          findUnique: vi.fn().mockResolvedValue({
            id: scenario.id.getValue(),
            workspaceId: WS_A,
            planId: planInA.id.getValue(),
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      } as unknown as PrismaClient;

      const raceRepo = new ScenarioRepositoryImpl(mockPrismaForRace);
      await expect(raceRepo.save(scenario)).rejects.toThrow(ScenarioNotFoundError);
    });

    it('should throw ForecastItemNotFoundError if child item disappears concurrently before updateMany in save', async () => {
      const planInA = await createPlanInDb(WS_A, 'Plan in A');
      const forecast = createForecastEntity(WS_A, planInA.id.getValue(), 'Forecast for Item Race');
      await forecastRepo.save(forecast);

      const item = ForecastItem.create({
        workspaceId: WorkspaceId.fromString(WS_A),
        forecastId: forecast.id,
        categoryId: CategoryId.fromString(CATEGORY_ID),
        amount: ForecastAmount.create(1500),
      });

      const mockPrismaForRace = {
        forecast: {
          findFirst: vi.fn().mockResolvedValue({ id: forecast.id.getValue() }),
        },
        forecastItem: {
          findUnique: vi.fn().mockResolvedValue({
            id: item.id.getValue(),
            workspaceId: WS_A,
            forecastId: forecast.id.getValue(),
            categoryId: CATEGORY_ID,
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      } as unknown as PrismaClient;

      const raceRepo = new ForecastItemRepositoryImpl(mockPrismaForRace);
      await expect(raceRepo.save(item)).rejects.toThrow(ForecastItemNotFoundError);
    });
  });
});
