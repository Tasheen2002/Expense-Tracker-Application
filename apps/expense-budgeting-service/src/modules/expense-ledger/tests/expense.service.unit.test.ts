import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseService } from '../application/services/expense.service';
import { IExpenseRepository } from '../domain/repositories/expense.repository';
import { ITagRepository } from '../domain/repositories/tag.repository';
import { PaymentMethod } from '../domain/enums/payment-method';
import { Tag } from '../domain/entities/tag.entity';
import { TagId } from '../domain/value-objects/tag-id';

// Mocks
const mockExpenseRepo = {
  save: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
} as unknown as IExpenseRepository;

const mockTagRepo = {
  findByIds: vi.fn(),
} as unknown as ITagRepository;

describe('ExpenseService (Unit)', () => {
  let service: ExpenseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExpenseService(mockExpenseRepo, mockTagRepo);
  });

  it('should dedup duplicate tag IDs and validate them only once', async () => {
    // Valid v4 UUIDs
    const uuid1 = '123e4567-e89b-42d3-a456-426614174000';
    const uuid2 = '123e4567-e89b-42d3-a456-426614174001';

    const params = {
      workspaceId: '123e4567-e89b-42d3-a456-426614174999',
      userId: '123e4567-e89b-42d3-a456-426614174888',
      title: 'Test Expense',
      amount: 100,
      currency: 'USD',
      expenseDate: '2023-01-01',
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
      tagIds: [uuid1, uuid1, uuid2],
    };

    const tag1 = Tag.fromPersistence({ id: TagId.fromString(uuid1), workspaceId: params.workspaceId, name: 'Tag1', createdAt: new Date() });
    const tag2 = Tag.fromPersistence({ id: TagId.fromString(uuid2), workspaceId: params.workspaceId, name: 'Tag2', createdAt: new Date() });

    // Mock Tag Repo response
    vi.mocked(mockTagRepo.findByIds).mockResolvedValue([tag1, tag2]);

    await service.createExpense(params);

    // Verify: findByIds should be called with 2 items, not 3
    expect(mockTagRepo.findByIds).toHaveBeenCalledTimes(1);
    const calledArgs = vi.mocked(mockTagRepo.findByIds).mock.calls[0][0];
    expect(calledArgs).toHaveLength(2); // Should correspond to unique tags

    // Verify save is called
    expect(mockExpenseRepo.save).toHaveBeenCalled();
  });

  it('should throw TagNotFoundError if any tag is missing or from another workspace', async () => {
    const uuid1 = '123e4567-e89b-42d3-a456-426614174000';
    const uuid2 = '123e4567-e89b-42d3-a456-426614174001';

    const params = {
      workspaceId: '123e4567-e89b-42d3-a456-426614174999',
      userId: '123e4567-e89b-42d3-a456-426614174888',
      title: 'Test Expense',
      amount: 100,
      currency: 'USD',
      expenseDate: '2023-01-01',
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
      tagIds: [uuid1, uuid2],
    };

    const tag1 = Tag.fromPersistence({ id: TagId.fromString(uuid1), workspaceId: params.workspaceId, name: 'Tag1', createdAt: new Date() });

    // Only 1 tag found
    vi.mocked(mockTagRepo.findByIds).mockResolvedValue([tag1]);

    await expect(service.createExpense(params)).rejects.toThrow();
  });

  it('should support partial update of amount while preserving existing currency', async () => {
    const { Expense } = await import('../domain/entities/expense.entity');
    const { Money } = await import('../domain/value-objects/money');
    const { ExpenseDate } = await import('../domain/value-objects/expense-date');

    const expense = Expense.create({
      workspaceId: 'ws-1',
      userId: 'user-1',
      title: 'Initial Expense',
      amount: Money.create(50, 'EUR'),
      expenseDate: ExpenseDate.create('2026-01-01'),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });

    vi.mocked(mockExpenseRepo.findById).mockResolvedValue(expense);

    const updated = await service.updateExpense(
      expense.id.getValue(),
      'ws-1',
      'user-1',
      { amount: 150 }
    );

    expect(updated.amount).toBe('150');
    expect(updated.currency).toBe('EUR');
    expect(mockExpenseRepo.update).toHaveBeenCalledTimes(1);
  });

  it('should support partial update of currency while preserving existing amount', async () => {
    const { Expense } = await import('../domain/entities/expense.entity');
    const { Money } = await import('../domain/value-objects/money');
    const { ExpenseDate } = await import('../domain/value-objects/expense-date');

    const expense = Expense.create({
      workspaceId: 'ws-1',
      userId: 'user-1',
      title: 'Initial Expense',
      amount: Money.create(50, 'EUR'),
      expenseDate: ExpenseDate.create('2026-01-01'),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });

    vi.mocked(mockExpenseRepo.findById).mockResolvedValue(expense);

    const updated = await service.updateExpense(
      expense.id.getValue(),
      'ws-1',
      'user-1',
      { currency: 'GBP' }
    );

    expect(updated.amount).toBe('50');
    expect(updated.currency).toBe('GBP');
    expect(mockExpenseRepo.update).toHaveBeenCalledTimes(1);
  });
});
