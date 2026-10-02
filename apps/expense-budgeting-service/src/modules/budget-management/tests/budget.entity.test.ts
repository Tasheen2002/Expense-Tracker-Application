import { describe, it, expect } from "vitest";
import { Budget } from "../domain/entities/budget.entity";
import { BudgetPeriodType } from "../domain/enums/budget-period-type";
import { BudgetStatus } from "../domain/enums/budget-status";
import { Decimal } from "@prisma/client/runtime/library";
import { BudgetThresholdExceededEventSchema } from '@expense-tracker/contracts';
import {
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidBudgetStatusError,
} from "../domain/errors/budget.errors";

describe("Budget Entity", () => {
  const validData = {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    name: "Test Budget",
    description: "A test budget",
    totalAmount: new Decimal(1000),
    currency: "USD",
    periodType: BudgetPeriodType.MONTHLY,
    startDate: new Date("2023-01-01"),
    createdBy: "44444444-4444-4444-8444-444444444444",
    isRecurring: false,
    rolloverUnused: false,
  };

  describe("create", () => {
    it('includes the creator in threshold events for notification routing', () => {
      const budget = Budget.create(validData);
      budget.activate();
      budget.clearDomainEvents();
      budget.markAsExceeded(1001);
      const event = budget.domainEvents.find(item => item.eventType === 'budget.threshold_exceeded');
      expect(event?.getPayload()).toMatchObject({ createdBy: validData.createdBy, workspaceId: validData.workspaceId });
      expect(BudgetThresholdExceededEventSchema.shape.data.safeParse(event?.getPayload()).success).toBe(true);
    });
    it("should create a valid budget", () => {
      const budget = Budget.create(validData);
      expect(budget).toBeDefined();
      expect(budget.id).toBeDefined();
      expect(budget.name).toBe("Test Budget");
      expect(budget.status).toBe(BudgetStatus.DRAFT);
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
      expect(budget.name).toBe("New Name");
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
      expect(budget.totalAmount.toNumber()).toBe(2000);
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
      expect(budget.status).toBe(BudgetStatus.ACTIVE);
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
      expect(budget.status).toBe(BudgetStatus.ARCHIVED);
    });
  });
});
