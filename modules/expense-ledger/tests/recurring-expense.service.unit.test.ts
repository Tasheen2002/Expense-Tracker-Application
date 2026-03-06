import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecurringExpenseService } from "../application/services/recurring-expense.service";
import { RecurringExpenseRepository } from "../domain/repositories/recurring-expense.repository";
import { ExpenseService } from "../application/services/expense.service";
import { RecurringExpense } from "../domain/entities/recurring-expense.entity";
import { RecurrenceFrequency } from "../domain/enums/recurrence-frequency";
import { RecurrenceStatus } from "../domain/enums/recurrence-status";
import { PaymentMethod } from "../domain/enums/payment-method";

describe("RecurringExpenseService", () => {
  let service: RecurringExpenseService;
  let mockRecurringRepo: Partial<RecurringExpenseRepository>;
  let mockExpenseService: Partial<ExpenseService>;

  beforeEach(() => {
    mockRecurringRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findDueExpenses: vi.fn(),
      delete: vi.fn(),
    };
    mockExpenseService = {
      createExpense: vi.fn(),
    };
    service = new RecurringExpenseService(
      mockRecurringRepo as RecurringExpenseRepository,
      mockExpenseService as ExpenseService,
    );
  });

  it("should create a recurring expense", async () => {
    const data = {
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date(),
      template: {
        title: "Netflix",
        amount: 15.99,
        currency: "USD",
      },
    };

    const result = await service.createRecurringExpense(data);

    expect(result).toBeInstanceOf(RecurringExpense);
    expect(result.frequency).toBe(RecurrenceFrequency.MONTHLY);
    expect(mockRecurringRepo.save).toHaveBeenCalledTimes(1);
  });

  it("should process due expenses", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Netflix",
        amount: 15.99,
        currency: "USD",
        paymentMethod: PaymentMethod.CREDIT_CARD,
      },
    });

    // Force set nextRunDate to past
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    (mockRecurring as any).props.nextRunDate = overdueDate;

    vi.mocked(mockRecurringRepo.findDueExpenses!).mockResolvedValue({
      items: [mockRecurring],
      total: 1,
      limit: 50,
      offset: 0,
      hasMore: false,
    });
    vi.mocked(mockExpenseService.createExpense!).mockResolvedValue({} as any);

    const processedCount = await service.processDueExpenses();

    expect(processedCount).toBe(1);
    expect(mockExpenseService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Netflix",
        amount: 15.99,
        expenseDate: overdueDate,
      }),
    );
    expect(mockRecurringRepo.save).toHaveBeenCalledTimes(1);
    // Next run date should be updated (approx 1 month later)
    expect(mockRecurring.nextRunDate.getTime()).toBeGreaterThan(
      overdueDate.getTime(),
    );
  });
});
