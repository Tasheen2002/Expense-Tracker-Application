import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService } from "../application/services/budget.service";
import {
  IBudgetRepository,
  BudgetFilters,
} from "../domain/repositories/budget.repository";
import { IBudgetAllocationRepository } from "../domain/repositories/budget-allocation.repository";
import { IBudgetAlertRepository } from "../domain/repositories/budget-alert.repository";
import { Budget } from "../domain/entities/budget.entity";
import { BudgetPeriodType } from "../domain/enums/budget-period-type";
import { BudgetStatus } from "../domain/enums/budget-status";
import { Decimal } from "@prisma/client/runtime/library";
import {
  BudgetNotFoundError,
  UnauthorizedBudgetAccessError,
} from "../domain/errors/budget.errors";

// Mock dependencies
const mockBudgetRepository = {
  save: vi.fn(),
  findById: vi.fn(),
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
  save: vi.fn(),
  findById: vi.fn(),
  saveWithAlerts: vi.fn(),
  delete: vi.fn(),
  findByBudget: vi.fn(),
} as unknown as IBudgetAllocationRepository;

const mockAlertRepository = {
  findUnreadAlerts: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
} as unknown as IBudgetAlertRepository;

describe("BudgetService", () => {
  let service: BudgetService;

  beforeEach(() => {
    service = new BudgetService(
      mockBudgetRepository,
      mockAllocationRepository,
      mockAlertRepository,
    );
    vi.clearAllMocks();
  });

  const validBudgetParams = {
    workspaceId: "workspace-123",
    name: "Test Budget",
    totalAmount: 1000,
    currency: "USD",
    periodType: BudgetPeriodType.MONTHLY,
    startDate: new Date(),
    createdBy: "user-123",
    isRecurring: false,
    rolloverUnused: false,
  };

  describe("createBudget", () => {
    it("should create and save a new budget", async () => {
      const budget = await service.createBudget(validBudgetParams);

      expect(budget).toBeDefined();
      expect(budget.getName()).toBe("Test Budget");
      expect(mockBudgetRepository.save).toHaveBeenCalledWith(budget);
    });
  });

  describe("updateBudget", () => {
    it("should update and save an existing budget", async () => {
      const existingBudget = Budget.create(validBudgetParams);
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(
        existingBudget,
      );
      vi.spyOn(
        mockAllocationRepository,
        "getTotalAllocatedAmount",
      ).mockResolvedValue(new Decimal(0));

      const updatedBudget = await service.updateBudget(
        existingBudget.getId().getValue(),
        "workspace-123",
        "user-123",
        { name: "Updated Name", totalAmount: "2000" },
      );

      expect(updatedBudget.getName()).toBe("Updated Name");
      expect(updatedBudget.getTotalAmount().toNumber()).toBe(2000);
      expect(mockBudgetRepository.save).toHaveBeenCalledWith(updatedBudget);
    });

    it("should throw BudgetNotFoundError if budget does not exist", async () => {
      vi.spyOn(mockBudgetRepository, "findById").mockResolvedValue(null);

      await expect(
        service.updateBudget(
          "123e4567-e89b-12d3-a456-426614174000",
          "workspace-123",
          "user-123",
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
          existingBudget.getId().getValue(),
          "workspace-123",
          "other-user",
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

      await service.activateBudget(
        existingBudget.getId().getValue(),
        "workspace-123",
        "user-123",
      );

      expect(existingBudget.getStatus()).toBe(BudgetStatus.ACTIVE);
      expect(mockBudgetRepository.save).toHaveBeenCalledWith(existingBudget);
    });
  });
});
