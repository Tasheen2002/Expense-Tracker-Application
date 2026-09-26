import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecurringExpenseService } from "../application/services/recurring-expense.service";
import { IRecurringExpenseRepository } from "../domain/repositories/recurring-expense.repository";
import { ExpenseService } from "../application/services/expense.service";
import { RecurringExpense } from "../domain/entities/recurring-expense.entity";
import { RecurrenceFrequency } from "../domain/enums/recurrence-frequency";
import { RecurrenceStatus } from "../domain/enums/recurrence-status";
import { PaymentMethod } from "../domain/enums/payment-method";
import { ExpenseDTO } from "../domain/entities/expense.entity";

import { IUnitOfWork } from "../application/ports/unit-of-work.port";
import { ICategoryRepository } from "../domain/repositories/category.repository";
import { ITagRepository } from "../domain/repositories/tag.repository";
import { TagNotFoundError } from "../domain/errors/expense.errors";

function setNextRunDate(recurring: RecurringExpense, date: Date): void {
  (recurring as unknown as { props: { nextRunDate: Date } }).props.nextRunDate = date;
}

describe("RecurringExpenseService", () => {
  let service: RecurringExpenseService;
  let mockRecurringRepo: Partial<IRecurringExpenseRepository>;
  let mockExpenseService: Partial<ExpenseService>;
  let mockUnitOfWork: Partial<IUnitOfWork>;
  let mockCategoryRepo: Partial<ICategoryRepository>;
  let mockTagRepo: Partial<ITagRepository>;

  beforeEach(() => {
    mockRecurringRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findDueExpenses: vi.fn(),
      claimNextDueExpense: vi.fn(),
      claimById: vi.fn(),
      delete: vi.fn(),
    };
    mockExpenseService = {
      createExpense: vi.fn(),
      getExpenseById: vi.fn().mockResolvedValue(null),
    };
    mockUnitOfWork = {
      execute: vi.fn().mockImplementation(async <T>(work: () => Promise<T>): Promise<T> => work()),
    };
    mockCategoryRepo = {
      findById: vi.fn().mockResolvedValue(null),
      exists: vi.fn().mockResolvedValue(true),
    };
    mockTagRepo = {
      findById: vi.fn().mockResolvedValue(null),
      exists: vi.fn().mockResolvedValue(true),
    };
    service = new RecurringExpenseService(
      mockRecurringRepo as IRecurringExpenseRepository,
      mockExpenseService as ExpenseService,
      mockUnitOfWork as IUnitOfWork,
      mockCategoryRepo as ICategoryRepository,
      mockTagRepo as ITagRepository,
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

    expect(result).toBeDefined();
    expect(result.frequency).toBe(RecurrenceFrequency.MONTHLY);
    expect(mockRecurringRepo.save).toHaveBeenCalledTimes(1);
  });

  it("should process due expenses inside a unit of work transaction with atomic row claim", async () => {
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
    setNextRunDate(mockRecurring, overdueDate);

    // First call claims row, second call returns null (no more due rows)
    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring)
      .mockResolvedValueOnce(null);
    vi.mocked(mockExpenseService.createExpense!).mockResolvedValue({} as unknown as ExpenseDTO);

    const processedCount = await service.processDueExpenses(10);

    expect(processedCount).toBe(1);
    expect(mockUnitOfWork.execute).toHaveBeenCalled();
    expect(mockRecurringRepo.claimNextDueExpense).toHaveBeenCalled();
    expect(mockExpenseService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        title: "Netflix",
        amount: 15.99,
        expenseDate: overdueDate,
      }),
    );
    expect(mockRecurringRepo.save).toHaveBeenCalledTimes(1);
    expect(mockRecurring.nextRunDate.getTime()).toBeGreaterThan(
      overdueDate.getTime(),
    );
  });

  it("should fall back categoryId to undefined if category was deleted after recurring creation", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Cloud Storage",
        amount: 29.99,
        currency: "USD",
        categoryId: "33333333-3333-4333-8333-333333333333",
      },
    });

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    setNextRunDate(mockRecurring, overdueDate);

    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring)
      .mockResolvedValueOnce(null);
    vi.mocked(mockCategoryRepo.exists!).mockResolvedValue(false);
    vi.mocked(mockExpenseService.createExpense!).mockResolvedValue({} as unknown as ExpenseDTO);

    const processedCount = await service.processDueExpenses();

    expect(processedCount).toBe(1);
    expect(mockExpenseService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cloud Storage",
        categoryId: undefined,
      })
    );
  });

  it("should propagate database/infrastructure errors from categoryRepository and NOT treat them as deleted categories", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Cloud Storage",
        amount: 29.99,
        currency: "USD",
        categoryId: "33333333-3333-4333-8333-333333333333",
      },
    });

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    setNextRunDate(mockRecurring, overdueDate);

    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring)
      .mockResolvedValueOnce(null);
    // Simulate DB connection failure during category lookup
    vi.mocked(mockCategoryRepo.exists!).mockRejectedValue(new Error("PostgreSQL connection timeout"));

    // Database/infrastructure failures are rethrown instead of reporting false success (0 processed)
    await expect(service.processDueExpenses()).rejects.toThrow("PostgreSQL connection timeout");

    expect(mockExpenseService.createExpense).not.toHaveBeenCalled();
    expect(mockRecurringRepo.save).not.toHaveBeenCalled();
  });

  it("should handle duplicate occurrence error idempotently without crashing", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "SaaS Subscription",
        amount: 99.00,
        currency: "USD",
      },
    });

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    setNextRunDate(mockRecurring, overdueDate);

    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring)
      .mockResolvedValueOnce(null);
    vi.mocked(mockRecurringRepo.claimById!).mockResolvedValue(mockRecurring);
    // Simulate unique constraint / duplicate error from previous run attempt
    vi.mocked(mockExpenseService.createExpense!).mockRejectedValue(
      new Error("Expense with this occurrence ID already exists")
    );
    // Occurrence check: null on initial creation attempt, found on conflict recovery
    vi.mocked(mockExpenseService.getExpenseById!)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "verified-occurrence-id" } as unknown as ExpenseDTO);

    const processedCount = await service.processDueExpenses();

    expect(processedCount).toBe(1);
    // Recurring schedule was advanced and saved after verifying occurrence
    expect(mockRecurringRepo.save).toHaveBeenCalledTimes(1);
  });

  it("should NOT advance recurring expense schedule when occurrence expense cannot be verified during conflict recovery", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Unverified Occurrence",
        amount: 50.0,
        currency: "USD",
      },
    });

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    setNextRunDate(mockRecurring, new Date(overdueDate));

    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring)
      .mockResolvedValueOnce(null);
    vi.mocked(mockRecurringRepo.claimById!).mockResolvedValue(mockRecurring);
    vi.mocked(mockExpenseService.createExpense!).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );
    // getExpenseById returns null on both initial check and recovery check
    vi.mocked(mockExpenseService.getExpenseById!).mockResolvedValue(null);

    const processedCount = await service.processDueExpenses(10);

    // Should NOT count as processed and should NOT advance schedule without verifying occurrence
    expect(processedCount).toBe(0);
    expect(mockRecurringRepo.save).not.toHaveBeenCalled();
    expect(mockRecurring.nextRunDate.getTime()).toBe(overdueDate.getTime());
  });

  it("should continue normal claiming for other due rows in batch when a conflicted row is locked by another worker", async () => {
    const mockRecurring1 = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Conflicted Row 1",
        amount: 25.0,
        currency: "USD",
      },
    });

    const mockRecurring2 = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Normal Row 2",
        amount: 35.0,
        currency: "USD",
      },
    });

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    setNextRunDate(mockRecurring1, new Date(overdueDate));
    setNextRunDate(mockRecurring2, new Date(overdueDate));

    // First claim gets Row 1, second claim gets Row 2, third claim gets null
    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring1)
      .mockResolvedValueOnce(mockRecurring2)
      .mockResolvedValueOnce(null);

    // Row 1 creation fails with duplicate conflict, and claimById returns null (locked by another worker)
    vi.mocked(mockExpenseService.createExpense!)
      .mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }))
      .mockResolvedValueOnce({} as unknown as ExpenseDTO);

    vi.mocked(mockRecurringRepo.claimById!).mockResolvedValueOnce(null);
    vi.mocked(mockExpenseService.getExpenseById!).mockResolvedValue(null);

    const processedCount = await service.processDueExpenses(10);

    // Row 1 was skipped (handled elsewhere), but Row 2 was claimed and processed in the same batch
    expect(processedCount).toBe(1);
    expect(mockRecurringRepo.save).toHaveBeenCalledTimes(1);
  });

  it("should pause recurring expense with workspace isolation", async () => {
    const mockRecurring = RecurringExpense.create({
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
    });

    vi.mocked(mockRecurringRepo.findById!).mockResolvedValue(mockRecurring);

    await service.pauseRecurringExpense(
      mockRecurring.id.getValue(),
      "workspace-123",
      "user-123"
    );

    expect(mockRecurringRepo.findById).toHaveBeenCalledWith(
      mockRecurring.id,
      "workspace-123"
    );
    expect(mockRecurring.status).toBe(RecurrenceStatus.PAUSED);
    expect(mockRecurringRepo.save).toHaveBeenCalledWith(mockRecurring);
  });

  it("should resume recurring expense with workspace isolation and ownership check", async () => {
    const mockRecurring = RecurringExpense.create({
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
    });
    mockRecurring.pause();

    vi.mocked(mockRecurringRepo.findById!).mockResolvedValue(mockRecurring);

    await service.resumeRecurringExpense(
      mockRecurring.id.getValue(),
      "workspace-123",
      "user-123"
    );

    expect(mockRecurringRepo.findById).toHaveBeenCalledWith(
      mockRecurring.id,
      "workspace-123"
    );
    expect(mockRecurring.status).toBe(RecurrenceStatus.ACTIVE);
    expect(mockRecurringRepo.save).toHaveBeenCalledWith(mockRecurring);
  });

  it("should stop recurring expense with workspace isolation and ownership check", async () => {
    const mockRecurring = RecurringExpense.create({
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
    });

    vi.mocked(mockRecurringRepo.findById!).mockResolvedValue(mockRecurring);

    await service.stopRecurringExpense(
      mockRecurring.id.getValue(),
      "workspace-123",
      "user-123"
    );

    expect(mockRecurringRepo.findById).toHaveBeenCalledWith(
      mockRecurring.id,
      "workspace-123"
    );
    expect(mockRecurring.status).toBe(RecurrenceStatus.COMPLETED);
    expect(mockRecurringRepo.save).toHaveBeenCalledWith(mockRecurring);
  });

  it("should reject non-owner modifying recurring expense with UnauthorizedExpenseAccessError", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-owner",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date(),
      template: {
        title: "Netflix",
        amount: 15.99,
        currency: "USD",
      },
    });

    vi.mocked(mockRecurringRepo.findById!).mockResolvedValue(mockRecurring);

    await expect(
      service.pauseRecurringExpense(
        mockRecurring.id.getValue(),
        "workspace-123",
        "user-other"
      )
    ).rejects.toThrow();
  });

  it("should reject recurring expense creation if template tag does not exist", async () => {
    vi.mocked(mockTagRepo.exists!).mockResolvedValue(false);

    await expect(
      service.createRecurringExpense({
        workspaceId: "workspace-123",
        userId: "user-123",
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date(),
        template: {
          title: "SaaS Subscription",
          amount: 25.0,
          currency: "USD",
          tagIds: ["11111111-1111-4111-8111-111111111111"],
        },
      })
    ).rejects.toThrow(TagNotFoundError);

    expect(mockRecurringRepo.save).not.toHaveBeenCalled();
  });

  it("should gracefully filter deleted tags during processing without crashing or blocking the batch", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Cloud Hosting",
        amount: 50.0,
        currency: "USD",
        tagIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
      },
    });

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    setNextRunDate(mockRecurring, overdueDate);

    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring)
      .mockResolvedValueOnce(null);

    // First tag exists, second tag was deleted
    vi.mocked(mockTagRepo.exists!)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const processed = await service.processDueExpenses();

    expect(processed).toBe(1);
    expect(mockExpenseService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cloud Hosting",
        tagIds: ["11111111-1111-4111-8111-111111111111"],
      })
    );
    expect(mockRecurringRepo.save).toHaveBeenCalled();
  });

  it("should advance schedule and unblock the batch if occurrence creation throws TagNotFoundError", async () => {
    const mockRecurring = RecurringExpense.create({
      workspaceId: "workspace-123",
      userId: "user-123",
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date("2023-01-01"),
      template: {
        title: "Broken Template",
        amount: 30.0,
        currency: "USD",
        tagIds: ["33333333-3333-4333-8333-333333333333"],
      },
    });

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1);
    setNextRunDate(mockRecurring, overdueDate);

    vi.mocked(mockRecurringRepo.claimNextDueExpense!)
      .mockResolvedValueOnce(mockRecurring)
      .mockResolvedValueOnce(null);

    vi.mocked(mockExpenseService.createExpense!).mockRejectedValueOnce(
      new TagNotFoundError("33333333-3333-4333-8333-333333333333", "workspace-123")
    );

    vi.mocked(mockRecurringRepo.claimById!).mockResolvedValueOnce(mockRecurring);

    const recordFailureSpy = vi.spyOn(mockRecurring, 'recordFailure');

    // Should not throw, should advance schedule
    await expect(service.processDueExpenses()).resolves.toBe(0);

    expect(recordFailureSpy).toHaveBeenCalledWith(
      expect.stringContaining("33333333-3333-4333-8333-333333333333")
    );
    expect(mockRecurring.consecutiveFailures).toBe(1);
    expect(mockRecurring.lastFailureReason).toContain("33333333-3333-4333-8333-333333333333");
    expect(mockRecurringRepo.save).toHaveBeenCalledWith(mockRecurring);
  });
});
