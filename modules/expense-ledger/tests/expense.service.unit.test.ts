import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExpenseService } from "../application/services/expense.service";
import { ExpenseRepository } from "../domain/repositories/expense.repository";
import { CategoryRepository } from "../domain/repositories/category.repository";
import { TagRepository } from "../domain/repositories/tag.repository";
import { TagId } from "../domain/value-objects/tag-id";
import { Expense } from "../domain/entities/expense.entity";

import { PaymentMethod } from "../domain/enums/payment-method";

// Mocks
const mockExpenseRepo = {
  save: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
} as unknown as ExpenseRepository;

const mockCategoryRepo = {
  exists: vi.fn(),
} as unknown as CategoryRepository;

const mockTagRepo = {
  findByIds: vi.fn(),
} as unknown as TagRepository;

describe("ExpenseService (Unit)", () => {
  let service: ExpenseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExpenseService(
      mockExpenseRepo,
      mockCategoryRepo,
      mockTagRepo,
    );
  });

  it("should dedup duplicate tag IDs and validate them only once", async () => {
    // Valid v4 UUIDs
    const uuid1 = "123e4567-e89b-42d3-a456-426614174000";
    const uuid2 = "123e4567-e89b-42d3-a456-426614174001";

    const params = {
      workspaceId: "123e4567-e89b-42d3-a456-426614174999",
      userId: "123e4567-e89b-42d3-a456-426614174888",
      title: "Test Expense",
      amount: 100,
      currency: "USD",
      expenseDate: "2023-01-01",
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
      tagIds: [uuid1, uuid1, uuid2],
    };

    // Mock Tag Repo response
    vi.mocked(mockTagRepo.findByIds).mockResolvedValue([
      { getId: () => ({ getValue: () => uuid1 }) },
      { getId: () => ({ getValue: () => uuid2 }) },
    ] as any);

    await service.createExpense(params);

    // Verify: findByIds should be called with 2 items, not 3
    expect(mockTagRepo.findByIds).toHaveBeenCalledTimes(1);
    const calledArgs = vi.mocked(mockTagRepo.findByIds).mock.calls[0][0];
    expect(calledArgs).toHaveLength(2); // Should correspond to unique tags

    // Verify save is called
    expect(mockExpenseRepo.save).toHaveBeenCalled();
  });
});
