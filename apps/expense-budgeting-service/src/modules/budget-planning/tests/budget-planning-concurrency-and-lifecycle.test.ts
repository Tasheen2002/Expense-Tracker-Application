import { describe, it, expect, vi } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { IEventBus } from '@core/domain/events/domain-event';
import { WorkspaceId, UserId, CategoryId } from '@core/domain/value-objects';
import { v4 as uuidv4 } from 'uuid';

import { BudgetPlan } from '../domain/entities/budget-plan.entity';
import { ForecastItem } from '../domain/entities/forecast-item.entity';
import { Forecast } from '../domain/entities/forecast.entity';
import { Scenario } from '../domain/entities/scenario.entity';

import { ForecastId } from '../domain/value-objects/forecast-id';
import { ForecastAmount } from '../domain/value-objects/forecast-amount';
import { PeriodType } from '../domain/enums/period-type.enum';
import { PlanStatus } from '../domain/enums/plan-status.enum';
import { ForecastType } from '../domain/enums/forecast-type.enum';
import { BUDGET_PLAN_EVENTS } from '../domain/constants/planning.constants';

import {
  ValidationError,
  BudgetPlanConcurrencyConflictError,
  CannotDeleteActivePlanError,
  InvalidPlanPeriodError,
} from '../domain/errors/budget-planning.errors';

import { BudgetPlanRepositoryImpl } from '../infrastructure/persistence/budget-plan.repository.impl';
import { ForecastRepositoryImpl } from '../infrastructure/persistence/forecast.repository.impl';
import { ForecastItemRepositoryImpl } from '../infrastructure/persistence/forecast-item.repository.impl';
import { ScenarioRepositoryImpl } from '../infrastructure/persistence/scenario.repository.impl';

import { BudgetPlanService } from '../application/services/budget-plan.service';
import { ForecastService } from '../application/services/forecast.service';
import { ScenarioService } from '../application/services/scenario.service';
import { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';

describe('Budget Planning Concurrency, Lifecycle & Atomic Boundaries', () => {
  const wsIdStr = uuidv4();
  const userIdStr = uuidv4();
  const workspaceId = WorkspaceId.fromString(wsIdStr);
  const createdBy = UserId.fromString(userIdStr);

  const createMockPrisma = () => {
    const mockTx = {
      budgetPlan: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      forecast: {
        findFirst: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(0),
      },
      forecastItem: {
        findFirst: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn().mockResolvedValue(0),
      },
      scenario: {
        findFirst: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(0),
      },
      outboxEvent: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const rootPrisma = {
      $transaction: vi.fn(async (callback: (tx: Prisma.TransactionClient) => Promise<any>) => {
        return callback(mockTx as unknown as Prisma.TransactionClient);
      }),
      budgetPlan: mockTx.budgetPlan,
      forecast: mockTx.forecast,
      forecastItem: mockTx.forecastItem,
      scenario: mockTx.scenario,
      outboxEvent: mockTx.outboxEvent,
    } as unknown as PrismaClient;

    return { rootPrisma, mockTx };
  };

  const mockEventBus: IEventBus = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };

  const mockWorkspaceAccess = {
    isAdminOrOwner: vi.fn().mockResolvedValue(true),
  };

  const createPlan = (status: PlanStatus = PlanStatus.DRAFT, version: number = 1) => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-12-31T00:00:00.000Z');
    return BudgetPlan.fromPersistence({
      id: uuidv4(),
      workspaceId: wsIdStr,
      name: 'Corporate Budget 2026',
      description: 'Annual operating plan',
      periodType: PeriodType.YEARLY,
      startDate: start,
      endDate: end,
      status,
      createdBy: userIdStr,
      version,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  describe('Finding 1: Partial Mutation Prevention in ForecastItem', () => {
    it('should not mutate amount if notes validation fails', () => {
      const item = ForecastItem.create({
        workspaceId,
        forecastId: ForecastId.create(),
        categoryId: CategoryId.create(),
        amount: ForecastAmount.create(100),
        notes: 'Original note',
      });

      const invalidNotes = 'n'.repeat(501);
      const newAmount = ForecastAmount.create(250);

      expect(() => item.updateDetails(newAmount, invalidNotes)).toThrow(ValidationError);

      // Invariant: amount and notes must not be partially updated
      expect(item.amount.toNumber()).toBe(100);
      expect(item.notes).toBe('Original note');
    });
  });

  describe('Date-Only Round Trip & Boundary Enforcement', () => {
    it('should reject same-calendar-day time intervals on createPlan', async () => {
      const { rootPrisma } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);
      const service = new BudgetPlanService(repo, mockWorkspaceAccess);

      const sameDayStart = new Date('2026-05-01T09:00:00.000Z');
      const sameDayEnd = new Date('2026-05-01T10:00:00.000Z');

      await expect(
        service.createPlan({
          workspaceId: wsIdStr,
          name: 'Same Day Plan',
          periodType: PeriodType.MONTHLY,
          startDate: sameDayStart,
          endDate: sameDayEnd,
          createdBy: userIdStr,
        })
      ).rejects.toThrow(InvalidPlanPeriodError);
    });

    it('should successfully normalize multi-day times and round-trip through persistence', async () => {
      const { rootPrisma } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);
      const service = new BudgetPlanService(repo, mockWorkspaceAccess);

      const startWithTime = new Date('2026-05-01T15:30:00.000Z');
      const endWithTime = new Date('2026-05-03T02:15:00.000Z');

      const dto = await service.createPlan({
        workspaceId: wsIdStr,
        name: 'Multi Day Plan',
        periodType: PeriodType.MONTHLY,
        startDate: startWithTime,
        endDate: endWithTime,
        createdBy: userIdStr,
      });

      // Assert normalized to date boundaries in ISO representation
      expect(dto.period.startDate).toBe('2026-05-01T00:00:00.000Z');
      expect(dto.period.endDate).toBe('2026-05-03T00:00:00.000Z');

      // Reconstitute from persistence with UTC midnight dates
      const reconstituted = BudgetPlan.fromPersistence({
        id: dto.id,
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description,
        periodType: PeriodType.MONTHLY,
        startDate: new Date(dto.period.startDate),
        endDate: new Date(dto.period.endDate),
        status: PlanStatus.DRAFT,
        createdBy: dto.createdBy,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(reconstituted.period.startDateOnly).toBe('2026-05-01');
      expect(reconstituted.period.endDateOnly).toBe('2026-05-03');
    });
  });

  describe('Deletion Concurrency & Status Enforcement', () => {
    it('should invoke markAsDeleted and persist budget_plan.deleted event inside deletion transaction', async () => {
      const { rootPrisma, mockTx } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);
      const service = new BudgetPlanService(repo, mockWorkspaceAccess);

      const plan = createPlan(PlanStatus.DRAFT, 1);
      vi.spyOn(repo, 'findById').mockResolvedValue(plan);

      await service.deletePlan(plan.id.getValue(), wsIdStr, userIdStr);

      // Verify DB deleteMany was called checking version and non-active status
      expect(mockTx.budgetPlan.deleteMany).toHaveBeenCalledWith({
        where: {
          id: plan.id.getValue(),
          workspaceId: wsIdStr,
          version: 1,
          status: { not: PlanStatus.ACTIVE },
        },
      });

      // Verify outbox persistence captured budget_plan.deleted
      expect(mockTx.outboxEvent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            aggregateId: plan.id.getValue(),
            eventType: 'budget_plan.deleted',
            status: 'PENDING',
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should throw CannotDeleteActivePlanError and not delete or emit event when plan is already active', async () => {
      const { rootPrisma, mockTx } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);
      const service = new BudgetPlanService(repo, mockWorkspaceAccess);

      const activePlan = createPlan(PlanStatus.ACTIVE);
      vi.spyOn(repo, 'findById').mockResolvedValue(activePlan);

      await expect(
        service.deletePlan(activePlan.id.getValue(), wsIdStr, userIdStr)
      ).rejects.toThrow(CannotDeleteActivePlanError);

      expect(mockTx.budgetPlan.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.outboxEvent.createMany).not.toHaveBeenCalled();
    });

    it('should throw CannotDeleteActivePlanError if plan was concurrently activated between read and delete', async () => {
      const { rootPrisma, mockTx } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);
      const service = new BudgetPlanService(repo, mockWorkspaceAccess);

      const draftPlan = createPlan(PlanStatus.DRAFT, 1);
      vi.spyOn(repo, 'findById').mockResolvedValue(draftPlan);

      // Concurrent activation race condition:
      // deleteMany matches 0 rows because row in DB was activated to status: ACTIVE
      mockTx.budgetPlan.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.budgetPlan.findUnique.mockResolvedValue({ status: PlanStatus.ACTIVE, version: 2 });

      await expect(
        service.deletePlan(draftPlan.id.getValue(), wsIdStr, userIdStr)
      ).rejects.toThrow(CannotDeleteActivePlanError);

      // Outbox must NOT persist deletion event
      expect(mockTx.outboxEvent.createMany).not.toHaveBeenCalled();
    });

    it('should throw BudgetPlanConcurrencyConflictError if plan was concurrently updated between read and delete', async () => {
      const { rootPrisma, mockTx } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);
      const service = new BudgetPlanService(repo, mockWorkspaceAccess);

      const draftPlan = createPlan(PlanStatus.DRAFT, 1);
      vi.spyOn(repo, 'findById').mockResolvedValue(draftPlan);

      // Concurrent update race condition: version moved from 1 to 2
      mockTx.budgetPlan.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.budgetPlan.findUnique.mockResolvedValue({ status: PlanStatus.DRAFT, version: 2 });

      await expect(
        service.deletePlan(draftPlan.id.getValue(), wsIdStr, userIdStr)
      ).rejects.toThrow(BudgetPlanConcurrencyConflictError);

      expect(mockTx.outboxEvent.createMany).not.toHaveBeenCalled();
    });
  });

  describe('Finding 4: Optimistic Concurrency Control (OCC)', () => {
    it('should atomically update version and synchronize entity when version matches', async () => {
      const { rootPrisma, mockTx } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);

      const plan = createPlan(PlanStatus.DRAFT, 1);
      mockTx.budgetPlan.findUnique.mockResolvedValue({ id: plan.id.getValue(), version: 1 });
      mockTx.budgetPlan.updateMany.mockResolvedValue({ count: 1 });

      await repo.save(plan);

      expect(mockTx.budgetPlan.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: plan.id.getValue(),
            workspaceId: wsIdStr,
            version: 1,
          },
          data: expect.objectContaining({
            version: { increment: 1 },
          }),
        })
      );

      // Invariant: Entity version synchronized to 2
      expect(plan.version).toBe(2);
    });

    it('should throw BudgetPlanConcurrencyConflictError and reject stale update when versions diverge', async () => {
      const { rootPrisma, mockTx } = createMockPrisma();
      const repo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);

      const stalePlan = createPlan(PlanStatus.DRAFT, 1);
      mockTx.budgetPlan.findUnique.mockResolvedValue({ id: stalePlan.id.getValue(), version: 2 });
      // updateMany finds 0 rows because another request already bumped the version to 2
      mockTx.budgetPlan.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.save(stalePlan)).rejects.toThrow(BudgetPlanConcurrencyConflictError);

      // Invariant: stale plan version must not be updated
      expect(stalePlan.version).toBe(1);
    });
  });

  describe('Distinct Forecast Item Events (Creation vs Update)', () => {
    it('should record ForecastItemCreatedEvent on addForecastItem', async () => {
      const { rootPrisma } = createMockPrisma();
      const forecastRepo = new ForecastRepositoryImpl(rootPrisma);
      const forecastItemRepo = new ForecastItemRepositoryImpl(rootPrisma);
      const planRepo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);

      const mockUnitOfWork: IUnitOfWork = {
        execute: vi.fn(async (work) => work()),
      };

      const forecastService = new ForecastService(
        forecastRepo,
        forecastItemRepo,
        planRepo,
        mockWorkspaceAccess,
        mockUnitOfWork
      );

      const plan = createPlan(PlanStatus.DRAFT, 1);
      const forecast = Forecast.create({
        workspaceId,
        planId: plan.id,
        name: 'Baseline Forecast',
        type: ForecastType.BASELINE,
      });

      vi.spyOn(forecastRepo, 'findById').mockResolvedValue(forecast);
      vi.spyOn(planRepo, 'findById').mockResolvedValue(plan);
      vi.spyOn(forecastItemRepo, 'countByForecastId').mockResolvedValue(0);
      vi.spyOn(forecastItemRepo, 'findByCategory').mockResolvedValue(null);
      vi.spyOn(forecastItemRepo, 'save').mockResolvedValue();
      vi.spyOn(planRepo, 'save').mockResolvedValue();

      await forecastService.addForecastItem({
        forecastId: forecast.id.getValue(),
        workspaceId: wsIdStr,
        categoryId: CategoryId.create().getValue(),
        amount: 500,
        notes: 'Initial allocation',
        userId: userIdStr,
      });

      // Verify FORECAST_ITEM_CREATED was recorded (not updated)
      expect(plan.domainEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: BUDGET_PLAN_EVENTS.FORECAST_ITEM_CREATED,
          }),
        ])
      );
    });

    it('should record ForecastItemUpdatedEvent on updateForecastItem', async () => {
      const { rootPrisma } = createMockPrisma();
      const forecastRepo = new ForecastRepositoryImpl(rootPrisma);
      const forecastItemRepo = new ForecastItemRepositoryImpl(rootPrisma);
      const planRepo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);

      const mockUnitOfWork: IUnitOfWork = {
        execute: vi.fn(async (work) => work()),
      };

      const forecastService = new ForecastService(
        forecastRepo,
        forecastItemRepo,
        planRepo,
        mockWorkspaceAccess,
        mockUnitOfWork
      );

      const plan = createPlan(PlanStatus.DRAFT, 1);
      const forecast = Forecast.create({
        workspaceId,
        planId: plan.id,
        name: 'Baseline Forecast',
        type: ForecastType.BASELINE,
      });

      const item = ForecastItem.create({
        workspaceId,
        forecastId: forecast.id,
        categoryId: CategoryId.create(),
        amount: ForecastAmount.create(300),
      });

      vi.spyOn(forecastItemRepo, 'findById').mockResolvedValue(item);
      vi.spyOn(forecastRepo, 'findById').mockResolvedValue(forecast);
      vi.spyOn(planRepo, 'findById').mockResolvedValue(plan);
      vi.spyOn(forecastItemRepo, 'save').mockResolvedValue();
      vi.spyOn(planRepo, 'save').mockResolvedValue();

      await forecastService.updateForecastItem({
        itemId: item.id.getValue(),
        workspaceId: wsIdStr,
        amount: 450,
        notes: 'Adjusted allocation',
        userId: userIdStr,
      });

      // Verify FORECAST_ITEM_UPDATED was recorded on update
      expect(plan.domainEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: BUDGET_PLAN_EVENTS.FORECAST_ITEM_UPDATED,
          }),
        ])
      );
    });
  });

  describe('Finding 5: Atomic Boundary for Child Writes and Domain Events', () => {
    it('should execute child delete and parent event save inside a single UnitOfWork transaction', async () => {
      const { rootPrisma } = createMockPrisma();
      const forecastRepo = new ForecastRepositoryImpl(rootPrisma);
      const forecastItemRepo = new ForecastItemRepositoryImpl(rootPrisma);
      const planRepo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);

      const mockUnitOfWork: IUnitOfWork = {
        execute: vi.fn(async (work) => work()),
      };

      const forecastService = new ForecastService(
        forecastRepo,
        forecastItemRepo,
        planRepo,
        mockWorkspaceAccess,
        mockUnitOfWork
      );

      const plan = createPlan(PlanStatus.DRAFT, 1);
      const forecast = Forecast.create({
        workspaceId,
        planId: plan.id,
        name: 'Q3 Forecast',
        type: ForecastType.BASELINE,
      });

      vi.spyOn(forecastRepo, 'findById').mockResolvedValue(forecast);
      vi.spyOn(planRepo, 'findById').mockResolvedValue(plan);
      vi.spyOn(forecastRepo, 'deleteWithItems').mockResolvedValue();
      vi.spyOn(planRepo, 'save').mockResolvedValue();

      await forecastService.deleteForecast(forecast.id.getValue(), wsIdStr, userIdStr);

      // Invariant: Unit of work was used to establish atomic boundary
      expect(mockUnitOfWork.execute).toHaveBeenCalled();
      expect(forecastRepo.deleteWithItems).toHaveBeenCalledWith(forecast.id, wsIdStr);
      expect(planRepo.save).toHaveBeenCalledWith(plan);

      // Invariant: Plan recorded forecast deleted event
      expect(plan.domainEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: BUDGET_PLAN_EVENTS.FORECAST_DELETED,
          }),
        ])
      );
    });

    it('should execute scenario delete and parent event save inside a single UnitOfWork transaction', async () => {
      const { rootPrisma } = createMockPrisma();
      const scenarioRepo = new ScenarioRepositoryImpl(rootPrisma);
      const planRepo = new BudgetPlanRepositoryImpl(rootPrisma, mockEventBus);

      const mockUnitOfWork: IUnitOfWork = {
        execute: vi.fn(async (work) => work()),
      };

      const scenarioService = new ScenarioService(
        scenarioRepo,
        planRepo,
        mockWorkspaceAccess,
        mockUnitOfWork
      );

      const plan = createPlan(PlanStatus.DRAFT, 1);
      const scenario = Scenario.create({
        workspaceId,
        planId: plan.id,
        name: 'Recession Scenario',
        createdBy,
      });

      vi.spyOn(scenarioRepo, 'findById').mockResolvedValue(scenario);
      vi.spyOn(planRepo, 'findById').mockResolvedValue(plan);
      vi.spyOn(scenarioRepo, 'delete').mockResolvedValue();
      vi.spyOn(planRepo, 'save').mockResolvedValue();

      await scenarioService.deleteScenario(scenario.id.getValue(), wsIdStr, userIdStr);

      // Invariant: Unit of work was used to establish atomic boundary
      expect(mockUnitOfWork.execute).toHaveBeenCalled();
      expect(scenarioRepo.delete).toHaveBeenCalledWith(scenario.id, wsIdStr);
      expect(planRepo.save).toHaveBeenCalledWith(plan);

      // Invariant: Plan recorded scenario deleted event
      expect(plan.domainEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: BUDGET_PLAN_EVENTS.SCENARIO_DELETED,
          }),
        ])
      );
    });
  });
});
