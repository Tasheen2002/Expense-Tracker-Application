import { describe, it, expect } from "vitest";
import { Budget } from "../domain/entities/budget.entity";
import { BudgetPeriodType } from "../domain/enums/budget-period-type";
import { BudgetStatus } from "../domain/enums/budget-status";
import { Decimal } from "@prisma/client/runtime/library";
import {
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidBudgetStatusError,
  BudgetAlreadyActiveError,
  InvalidBudgetPeriodError,
} from "../domain/errors/budget.errors";

describe("Budget Entity", () => {
  const validData = {
    workspaceId: "workspace-123",
    name: "Test Budget",
    description: "A test budget",
    totalAmount: new Decimal(1000),
    currency: "USD",
    periodType: BudgetPeriodType.MONTHLY,
    startDate: new Date("2023-01-01"),
    createdBy: "user-123",
    isRecurring: false,
    rolloverUnused: false,
  };

  describe("create", () => {
    it("should create a valid budget", () => {
      const budget = Budget.create(validData);
      expect(budget).toBeDefined();
      expect(budget.getId()).toBeDefined();
      expect(budget.getName()).toBe("Test Budget");
      expect(budget.getStatus()).toBe(BudgetStatus.DRAFT);
    });

    it("should throw error for invalid amount", () => {
      expect(() => {
        Budget.create({ ...validData, totalAmount: new Decimal(-100) });
      }).toThrow(InvalidAmountError);

      expect(() => {
        Budget.create({ ...validData, totalAmount: new Decimal(0) });
      }).toThrow(InvalidAmountError);
    });

    it("should throw error for invalid currency", () => {
      expect(() => {
        Budget.create({ ...validData, currency: "US" });
      }).toThrow(InvalidCurrencyError);
    });
  });

  describe("updateName", () => {
    it("should update name", () => {
      const budget = Budget.create(validData);
      budget.updateName("New Name");
      expect(budget.getName()).toBe("New Name");
    });

    it("should throw error for empty name", () => {
      const budget = Budget.create(validData);
      expect(() => {
        budget.updateName("");
      }).toThrow("Budget name is required");
    });
  });

  describe("updateTotalAmount", () => {
    it("should update total amount", () => {
      const budget = Budget.create(validData);
      budget.updateTotalAmount(2000);
      expect(budget.getTotalAmount().toNumber()).toBe(2000);
    });

    it("should throw error for invalid amount", () => {
      const budget = Budget.create(validData);
      expect(() => {
        budget.updateTotalAmount(-500);
      }).toThrow(InvalidAmountError);
    });
  });

  describe("activate", () => {
    it("should activate budget", () => {
      const budget = Budget.create(validData);
      budget.activate();
      expect(budget.getStatus()).toBe(BudgetStatus.ACTIVE);
    });

    it("should throw error if already active", () => {
      const budget = Budget.create(validData);
      budget.activate();
      expect(() => {
        budget.activate();
      }).toThrow(InvalidBudgetStatusError);
    });
  });

  describe("archive", () => {
    it("should archive budget", () => {
      const budget = Budget.create(validData);
      budget.activate(); // specific transition might be needed? DRAFT -> ARCHIVED allowed?
      // Assuming DRAFT -> ARCHIVED is allowed. If not, must be ACTIVE.
      // Let's check status transitions in budget-status.ts if needed, but assuming DRAFT->ARCHIVED is valid, logic:
      // If isValidStatusTransition allows it.
      // Actually DRAFT->ARCHIVED is usually valid.
      budget.archive();
      expect(budget.getStatus()).toBe(BudgetStatus.ARCHIVED);
    });
  });
});
