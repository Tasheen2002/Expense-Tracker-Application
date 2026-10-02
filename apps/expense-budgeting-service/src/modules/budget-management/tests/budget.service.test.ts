import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService } from "../application/services/budget.service";
import {
  IBudgetRepository,
} from "../domain/repositories/budget.repository";
import { IBudgetAllocationRepository } from "../domain/repositories/budget-allocation.repository";
import { IBudgetAlertRepository } from "../domain/repositories/budget-alert.repository";
import { Budget } from "../domain/entities/budget.entity";
import { BudgetAllocation } from "../domain/entities/budget-allocation.entity";
import { BudgetPeriodType } from "../domain/enums/budget-period-type";
import { BudgetStatus } from "../domain/enums/budget-status";
import { Decimal } from "@prisma/client/runtime/library";
import {
  AllocationNotFoundError,
  BudgetAlreadyExistsError,
  BudgetNotFoundError,
  UnauthorizedBudgetAccessError,
} from "../domain/errors/budget.errors";

// Mock dependencies
const mockBudgetRepository = {
  create: vi.fn(),
  save: vi.fn(),
  saveWithAllocationValidation: vi.fn(),
  findById: vi.fn(),
  findByIdInternal: vi.fn(),
  findByIdInternalWithLock: vi.fn(),
  findByWorkspace: vi.fn(),
  findActiveBudgets: vi.fn(),
  findByFilters: vi.fn(),
  findExpiredBudgets: vi.fn(),
  exists: vi.fn(),
  existsByName: vi.fn(),
  delete: vi.fn(),
} as unknown as IBudgetRepository;

const mockAllocationRepository = {
  getTotalAllocatedAmount: vi.fn(),
  getTotalSpentAmount: vi.fn(),
  save: vi.fn(),
  findById: vi.fn(),
  findByIdInWorkspace: vi.fn(),
  saveWithAlerts: vi.fn(),
  delete: vi.fn(),
  findByBudget: vi.fn(),
} as unknown as IBudgetAllocationRepository;

const mockAlertRepository = {
  findUnreadAlerts: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
} as unknown as IBudgetAlertRepository;

const mockUnitOfWork = {
  execute: vi.fn(async (work: () => Promise<any>) => await work()),
};

describe("BudgetService", () => {
  let service: BudgetService;

  beforeEach(() => {
    service = new BudgetService(
      mockBudgetRepository,
      mockAllocationRepository,
      mockAlertRepository,
      mockUnitOfWork as any
    );
    vi.clearAllMocks();
    vi.mocked(mockBudgetRepository.existsByName).mockReset();
    vi.mocked(mockBudgetRepository.findByIdInternalWithLock).mockReset();
    vi.mocked(mockBudgetRepository.findByIdInternalWithLock).mockImplementation(
      async (id) => mockBudgetRepository.findById(id, validBudgetParams.workspaceId)
    );
  });

  const validBudgetParams = {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    name: "Test Budget",
    totalAmount: 1000,
    currency: "USD",
    periodType: BudgetPeriodType.MONTHLY,
    startDate: new Date(),
    createdBy: "44444444-4444-4444-8444-444444444444",
    isRecurring: false,
    rolloverUnused: false,
  };

  describe("createBudget", () => {
    it("should create and save a new budget", async () => {
      const budgetDTO = await service.createBudget(validBudgetParams);

      expect(budgetDTO).toBeDefined();
      expect(budgetDTO.name).toBe("Test Budget");
      expect(mockBudgetRepository.create).toHaveBeenCalledTimes(1);
    });

    it("checks the normalized name before saving", async () => {
      await service.createBudget({ ...validBudgetParams, name: '  Travel  ' });
      expect(mockBudgetRepository.existsByName).toHaveBeenCalledWith(
        'Travel', validBudgetParams.workspaceId
      );
    });
  });

  describe("updateBudget", () => {
    it("rejects an empty name instead of silently skipping it", async () => {
      const budget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, 'findById').mockResolvedValue(budget);
      await expect(service.updateBudget(
        budget.id.getValue(), budget.workspaceId, budget.createdBy, { name: '' }
      )).rejects.toThrow();
      expect(mockBudgetRepository.save).not.toHaveBeenCalled();
    });

    it("rejects a renamed budget when the name already exists in its workspace", async () => {
      const budget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, 'findById').mockResolvedValue(budget);
      vi.spyOn(mockBudgetRepository, 'existsByName').mockResolvedValue(true);
      await expect(service.updateBudget(
        budget.id.getValue(), budget.workspaceId, budget.createdBy, { name: '  Travel  ' }
      )).rejects.toThrow(BudgetAlreadyExistsError);
      expect(mockBudgetRepository.existsByName).toHaveBeenCalledWith('Travel', budget.workspaceId);
      expect(mockBudgetRepository.save).not.toHaveBeenCalled();
    });
    it("should update and save an existing budget with totalAmount via saveWithAllocationValidation", async () => {
      const existingBudget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(
        existingBudget,
      );

      const updatedBudgetDTO = await service.updateBudget(
        existingBudget.id.getValue(),
        "11111111-1111-4111-8111-111111111111",
        "44444444-4444-4444-8444-444444444444",
        { name: "Updated Name", totalAmount: "2000" },
      );

      expect(updatedBudgetDTO.name).toBe("Updated Name");
      expect(Number(updatedBudgetDTO.totalAmount)).toBe(2000);
      expect(mockBudgetRepository.saveWithAllocationValidation).toHaveBeenCalledTimes(1);
    });

    it("should update name only and save via regular save", async () => {
      const existingBudget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(
        existingBudget,
      );

      const updatedBudgetDTO = await service.updateBudget(
        existingBudget.id.getValue(),
        "11111111-1111-4111-8111-111111111111",
        "44444444-4444-4444-8444-444444444444",
        { name: "Updated Name Only" },
      );

      expect(updatedBudgetDTO.name).toBe("Updated Name Only");
      expect(mockBudgetRepository.save).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepository.saveWithAllocationValidation).not.toHaveBeenCalled();
    });

    it("should throw BudgetNotFoundError if budget does not exist", async () => {
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(null);

      await expect(
        service.updateBudget(
          "123e4567-e89b-12d3-a456-426614174000",
          "11111111-1111-4111-8111-111111111111",
          "44444444-4444-4444-8444-444444444444",
          {},
        ),
      ).rejects.toThrow(BudgetNotFoundError);
    });

    it("should throw UnauthorizedBudgetAccessError if user is not creator", async () => {
      const existingBudget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(
        existingBudget,
      );

      await expect(
        service.updateBudget(
          existingBudget.id.getValue(),
          "11111111-1111-4111-8111-111111111111",
          "66666666-6666-4666-8666-666666666666",
          {},
        ),
      ).rejects.toThrow(UnauthorizedBudgetAccessError);
    });
  });

  describe("activateBudget", () => {
    it("should activate and save budget", async () => {
      const existingBudget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(
        existingBudget,
      );

      const dto = await service.activateBudget(
        existingBudget.id.getValue(),
        "11111111-1111-4111-8111-111111111111",
        "44444444-4444-4444-8444-444444444444",
      );

      expect(dto.status).toBe(BudgetStatus.ACTIVE);
      expect(mockBudgetRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteBudget", () => {
    it("should mark as deleted and delete budget", async () => {
      const existingBudget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(
        existingBudget,
      );

      await service.deleteBudget(
        existingBudget.id.getValue(),
        "11111111-1111-4111-8111-111111111111",
        "44444444-4444-4444-8444-444444444444"
      );

      expect(mockBudgetRepository.save).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepository.delete).toHaveBeenCalledTimes(1);
    });

    it("should execute deleteBudget inside UnitOfWork when provided", async () => {
      const mockUnitOfWork = {
        execute: vi.fn(async (work: () => Promise<any>) => await work()),
      };
      const uowService = new BudgetService(
        mockBudgetRepository,
        mockAllocationRepository,
        mockAlertRepository,
        mockUnitOfWork as any
      );

      const existingBudget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(
        existingBudget,
      );

      await uowService.deleteBudget(
        existingBudget.id.getValue(),
        "11111111-1111-4111-8111-111111111111",
        "44444444-4444-4444-8444-444444444444"
      );

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepository.save).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepository.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteAllocation", () => {
    it("should throw AllocationNotFoundError if allocation does not exist", async () => {
      vi.spyOn(mockAllocationRepository, "findByIdInWorkspace").mockResolvedValue(null);

      await expect(
        service.deleteAllocation(
          "123e4567-e89b-12d3-a456-426614174099",
          "11111111-1111-4111-8111-111111111111",
          "44444444-4444-4444-8444-444444444444",
          "123e4567-e89b-12d3-a456-426614174000"
        )
      ).rejects.toThrow(AllocationNotFoundError);
    });

    it("should throw AllocationNotFoundError if allocation does not belong to specified budgetId", async () => {
      const budget = Budget.create(validBudgetParams);
      const allocation = BudgetAllocation.create({
        budgetId: budget.id.getValue(),
        allocatedAmount: 100,
      });
      vi.spyOn(mockAllocationRepository, "findByIdInWorkspace").mockResolvedValue(allocation);

      await expect(
        service.deleteAllocation(
          allocation.id.getValue(),
          "11111111-1111-4111-8111-111111111111",
          "44444444-4444-4444-8444-444444444444",
          "123e4567-e89b-12d3-a456-999999999999" // different budgetId
        )
      ).rejects.toThrow(AllocationNotFoundError);
    });

    it("should not find an allocation outside the specified workspace", async () => {
      // Allocation belongs to Workspace B's budget
      const budgetInWorkspaceB = Budget.create({
        ...validBudgetParams,
        workspaceId: "33333333-3333-4333-8333-333333333333",
      });
      const allocationInWorkspaceB = BudgetAllocation.create({
        budgetId: budgetInWorkspaceB.id.getValue(),
        allocatedAmount: 100,
      });

      vi.spyOn(mockAllocationRepository, "findByIdInWorkspace").mockResolvedValue(null);

      await expect(
        service.deleteAllocation(
          allocationInWorkspaceB.id.getValue(),
          "22222222-2222-4222-8222-222222222222", // Attempting cross-workspace deletion through 22222222-2222-4222-8222-222222222222
          "44444444-4444-4444-8444-444444444444",
          budgetInWorkspaceB.id.getValue()
        )
      ).rejects.toThrow(AllocationNotFoundError);

      expect(mockAllocationRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedBudgetAccessError if user is not budget creator", async () => {
      const budget = Budget.create({
        ...validBudgetParams,
        createdBy: "55555555-5555-4555-8555-555555555555",
      });
      const allocation = BudgetAllocation.create({
        budgetId: budget.id.getValue(),
        allocatedAmount: 100,
      });

      vi.spyOn(mockAllocationRepository, "findByIdInWorkspace").mockResolvedValue(allocation);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(budget);

      await expect(
        service.deleteAllocation(
          allocation.id.getValue(),
          "11111111-1111-4111-8111-111111111111",
          "66666666-6666-4666-8666-666666666666", // Not creator
          budget.id.getValue()
        )
      ).rejects.toThrow(UnauthorizedBudgetAccessError);

      expect(mockAllocationRepository.delete).not.toHaveBeenCalled();
    });

    it("should successfully record deletion event on parent budget and delete allocation", async () => {
      const budget = Budget.create(validBudgetParams);
      const allocation = BudgetAllocation.create({
        budgetId: budget.id.getValue(),
        allocatedAmount: 100,
      });

      vi.spyOn(mockAllocationRepository, "findByIdInWorkspace").mockResolvedValue(allocation);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(budget);

      await service.deleteAllocation(
        allocation.id.getValue(),
        "11111111-1111-4111-8111-111111111111",
        "44444444-4444-4444-8444-444444444444",
        budget.id.getValue()
      );

      expect(mockBudgetRepository.save).toHaveBeenCalledTimes(1);
      expect(mockAllocationRepository.delete).toHaveBeenCalledTimes(1);
    });

    it("should execute parent budget event save and child allocation delete inside UnitOfWork", async () => {
      const mockUnitOfWork = {
        execute: vi.fn(async (work: () => Promise<any>) => await work()),
      };
      const uowService = new BudgetService(
        mockBudgetRepository,
        mockAllocationRepository,
        mockAlertRepository,
        mockUnitOfWork as any
      );

      const budget = Budget.create(validBudgetParams);
      const allocation = BudgetAllocation.create({
        budgetId: budget.id.getValue(),
        allocatedAmount: 100,
      });

      vi.spyOn(mockAllocationRepository, "findByIdInWorkspace").mockResolvedValue(allocation);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(budget);

      await uowService.deleteAllocation(
        allocation.id.getValue(),
        "11111111-1111-4111-8111-111111111111",
        "44444444-4444-4444-8444-444444444444",
        budget.id.getValue()
      );

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepository.save).toHaveBeenCalledTimes(1);
      expect(mockAllocationRepository.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateAllocationSpent", () => {
    it("should not mark parent budget as EXCEEDED when an allocation is overdrawn but total spending is under budget limit", async () => {
      const budget = Budget.create({ ...validBudgetParams, totalAmount: 1000 });
      budget.activate();
      const allocation = BudgetAllocation.create({
        budgetId: budget.id.getValue(),
        allocatedAmount: 100,
      });

      vi.spyOn(mockAllocationRepository, "findById").mockResolvedValue(allocation);
      vi.spyOn(mockBudgetRepository, "findByIdInternalWithLock").mockResolvedValue(budget);
      // Allocation spent is 101, but total across all allocations is 101, which is < 1000
      vi.spyOn(mockAllocationRepository, "getTotalSpentAmount").mockResolvedValue(new Decimal(101));

      const dto = await service.updateAllocationSpent(allocation.id.getValue(), 101);

      expect(dto.isOverBudget).toBe(true); // Allocation itself is over budget
      expect(budget.status).toBe(BudgetStatus.ACTIVE); // Parent budget remains ACTIVE!
    });

    it("should mark parent budget as EXCEEDED when total spending across allocations exceeds parent budget limit", async () => {
      const budget = Budget.create({ ...validBudgetParams, totalAmount: 1000 });
      budget.activate();
      const allocation = BudgetAllocation.create({
        budgetId: budget.id.getValue(),
        allocatedAmount: 500,
      });

      vi.spyOn(mockAllocationRepository, "findById").mockResolvedValue(allocation);
      vi.spyOn(mockBudgetRepository, "findByIdInternalWithLock").mockResolvedValue(budget);
      // Total spent across allocations is 1050 > 1000
      vi.spyOn(mockAllocationRepository, "getTotalSpentAmount").mockResolvedValue(new Decimal(1050));

      await service.updateAllocationSpent(allocation.id.getValue(), 550);

      expect(budget.status).toBe(BudgetStatus.EXCEEDED);
      expect(mockBudgetRepository.save).toHaveBeenCalled();
    });

    it("should execute cross-aggregate writes inside UnitOfWork transaction when provided", async () => {
      const budget = Budget.create({ ...validBudgetParams, totalAmount: 1000 });
      budget.activate();
      const allocation = BudgetAllocation.create({
        budgetId: budget.id.getValue(),
        allocatedAmount: 500,
      });

      vi.spyOn(mockAllocationRepository, "findById").mockResolvedValue(allocation);
      vi.spyOn(mockBudgetRepository, "findByIdInternalWithLock").mockResolvedValue(budget);
      vi.spyOn(mockAllocationRepository, "getTotalSpentAmount").mockResolvedValue(new Decimal(1050));

      await service.updateAllocationSpent(allocation.id.getValue(), 550);

      expect(mockUnitOfWork.execute).toHaveBeenCalled();
      expect(mockAllocationRepository.saveWithAlerts).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepository.save).toHaveBeenCalled();
    });
  });

  describe("processExpiredBudgets", () => {
    it("should process all expired budgets across multiple pages until none remain", async () => {
      // Create batch of 50 budgets for page 1, and 25 for page 2
      const page1Budgets = Array.from({ length: 50 }, (_, i) => {
        const b = Budget.create({ ...validBudgetParams, name: `Budget P1-${i}`, startDate: new Date('2020-01-01') });
        b.activate();
        return b;
      });
      const page2Budgets = Array.from({ length: 25 }, (_, i) => {
        const b = Budget.create({ ...validBudgetParams, name: `Budget P2-${i}`, startDate: new Date('2020-01-01') });
        b.activate();
        return b;
      });

      const byId = new Map([...page1Budgets, ...page2Budgets].map((budget) => [budget.id.getValue(), budget]));
      vi.spyOn(mockBudgetRepository, 'findByIdInternalWithLock').mockImplementation(async (id) =>
        byId.get(id.getValue()) ?? null
      );

      // First call returns 50 items, second call returns 25 items (< batchSize of 50, terminating loop)
      vi.spyOn(mockBudgetRepository, "findExpiredBudgets")
        .mockResolvedValueOnce({
          items: page1Budgets,
          total: 75,
          limit: 50,
          offset: 0,
          hasMore: true,
        })
        .mockResolvedValueOnce({
          items: page2Budgets,
          total: 75,
          limit: 50,
          offset: 0,
          hasMore: false,
        });

      const processedCount = await service.processExpiredBudgets("11111111-1111-4111-8111-111111111111");

      expect(processedCount).toBe(75);
      expect(mockBudgetRepository.findExpiredBudgets).toHaveBeenCalledTimes(2);
      expect(mockBudgetRepository.save).toHaveBeenCalledTimes(75);

      // Verify all budgets were transitioned to ARCHIVED
      for (const b of [...page1Budgets, ...page2Budgets]) {
        expect(b.status).toBe(BudgetStatus.ARCHIVED);
      }
    });

    it("should handle zero expired budgets gracefully", async () => {
      vi.spyOn(mockBudgetRepository, "findExpiredBudgets").mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const processedCount = await service.processExpiredBudgets("11111111-1111-4111-8111-111111111111");

      expect(processedCount).toBe(0);
      expect(mockBudgetRepository.findExpiredBudgets).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepository.save).not.toHaveBeenCalled();
    });

    it('does not archive a budget another worker already archived', async () => {
      const stale = Budget.create({ ...validBudgetParams, startDate: new Date('2020-01-01') });
      stale.activate();
      const current = Budget.fromPersistence({
        id: stale.id,
        workspaceId: stale.workspaceId,
        name: stale.name,
        description: stale.description,
        totalAmount: stale.totalAmount,
        currency: stale.currency,
        period: stale.period,
        status: BudgetStatus.ARCHIVED,
        createdBy: stale.createdBy,
        isRecurring: stale.isRecurring(),
        rolloverUnused: stale.shouldRolloverUnused(),
        createdAt: stale.createdAt,
        updatedAt: stale.updatedAt,
      });
      vi.spyOn(mockBudgetRepository, 'findExpiredBudgets').mockResolvedValueOnce({
        items: [stale], total: 1, limit: 50, offset: 0, hasMore: false,
      });
      vi.spyOn(mockBudgetRepository, 'findByIdInternalWithLock').mockResolvedValue(current);

      expect(await service.processExpiredBudgets(validBudgetParams.workspaceId)).toBe(0);
      expect(mockBudgetRepository.save).not.toHaveBeenCalled();
    });
  });
});

