import { describe, it, expect, vi } from 'vitest';
import { ExpenseRepositoryImpl } from '../infrastructure/persistence/expense.repository.impl';
import { CategoryRepositoryImpl } from '../infrastructure/persistence/category.repository.impl';
import { TagRepositoryImpl } from '../infrastructure/persistence/tag.repository.impl';
import { ExpenseSplitRepositoryImpl } from '../infrastructure/persistence/expense-split.repository.impl';
import { Expense } from '../domain/entities/expense.entity';
import { Category } from '../domain/entities/category.entity';
import { Tag } from '../domain/entities/tag.entity';
import { ExpenseSplit } from '../domain/entities/expense-split.entity';
import { ExpenseId } from '../domain/value-objects/expense-id';
import { ExpenseDate } from '../domain/value-objects/expense-date';
import { Money } from '../domain/value-objects/money';
import { SplitType } from '../domain/enums/split-type';
import { PaymentMethod } from '../domain/enums/payment-method';
import { ExpenseService } from '../application/services/expense.service';
import { IExpenseRepository } from '../domain/repositories/expense.repository';
import { PrismaClient, Prisma } from '@prisma/client';
import { IEventBus } from '@core/domain/events/domain-event';

describe('Atomic Outbox Deletion Event Persistence', () => {
  const createMockPrisma = () => {
    const mockTx = {
      expense: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue({}),
      },
      category: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue({}),
      },
      tag: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue({}),
      },
      expenseSplit: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue({}),
      },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };

    const rootPrisma = {
      $transaction: vi.fn(async (callback: (tx: Prisma.TransactionClient) => Promise<any>) => {
        return callback(mockTx as unknown as Prisma.TransactionClient);
      }),
      expense: mockTx.expense,
      category: mockTx.category,
      tag: mockTx.tag,
      expenseSplit: mockTx.expenseSplit,
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

  it('persists ExpenseDeletedEvent to outbox inside the transaction on expense deletion', async () => {
    const { rootPrisma, mockTx } = createMockPrisma();
    const repo = new ExpenseRepositoryImpl(rootPrisma, mockEventBus);

    const expense = Expense.create({
      workspaceId: 'ws-123',
      userId: 'user-123',
      title: 'Office Supplies',
      amount: Money.create(50, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: false,
    });

    expense.markAsDeleted();
    expect(expense.domainEvents.length).toBeGreaterThan(0);
    const eventType = expense.domainEvents[0].eventType;

    await repo.delete(expense.id, expense.workspaceId, expense);

    expect(mockTx.expense.delete).toHaveBeenCalledWith({
      where: {
        id: expense.id.getValue(),
        workspaceId: 'ws-123',
      },
    });

    expect(mockTx.outboxEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          aggregateId: expense.id.getValue(),
          eventType,
          status: 'PENDING',
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it('persists CategoryDeletedEvent to outbox inside the transaction on category deletion', async () => {
    const { rootPrisma, mockTx } = createMockPrisma();
    const repo = new CategoryRepositoryImpl(rootPrisma, mockEventBus);

    const category = Category.create({
      workspaceId: 'ws-123',
      name: 'Travel',
      isActive: true,
    });

    category.markAsDeleted();
    const eventType = category.domainEvents[0].eventType;

    await repo.delete(category.id, category.workspaceId, category);

    expect(mockTx.category.delete).toHaveBeenCalledWith({
      where: {
        id: category.id.getValue(),
        workspaceId: 'ws-123',
      },
    });

    expect(mockTx.outboxEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          aggregateId: category.id.getValue(),
          eventType,
          status: 'PENDING',
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it('persists TagDeletedEvent to outbox inside the transaction on tag deletion', async () => {
    const { rootPrisma, mockTx } = createMockPrisma();
    const repo = new TagRepositoryImpl(rootPrisma, mockEventBus);

    const tag = Tag.create({
      workspaceId: 'ws-123',
      name: 'Urgent',
    });

    tag.markAsDeleted();
    const eventType = tag.domainEvents[0].eventType;

    await repo.delete(tag.id, tag.workspaceId, tag);

    expect(mockTx.tag.delete).toHaveBeenCalledWith({
      where: {
        id: tag.id.getValue(),
        workspaceId: 'ws-123',
      },
    });

    expect(mockTx.outboxEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          aggregateId: tag.id.getValue(),
          eventType,
          status: 'PENDING',
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it('persists SplitDeletedEvent to outbox inside the transaction on split deletion', async () => {
    const { rootPrisma, mockTx } = createMockPrisma();
    const repo = new ExpenseSplitRepositoryImpl(rootPrisma, mockEventBus);

    const split = ExpenseSplit.create({
      expenseId: ExpenseId.create(),
      workspaceId: 'ws-123',
      paidBy: 'user-123',
      totalAmount: Money.create(100, 'USD'),
      splitType: SplitType.EQUAL,
      participants: [{ userId: 'user-123' }, { userId: 'user-456' }],
    });

    split.markAsDeleted();
    const eventType = split.domainEvents[0].eventType;

    await repo.delete(split.id, split.workspaceId, split);

    expect(mockTx.expenseSplit.delete).toHaveBeenCalledWith({
      where: {
        id: split.id.getValue(),
        workspaceId: 'ws-123',
      },
    });

    expect(mockTx.outboxEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          aggregateId: split.id.getValue(),
          eventType,
          status: 'PENDING',
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it('ensures application services pass the aggregate to repository delete', async () => {
    const mockExpenseRepo = {
      findById: vi.fn(),
      delete: vi.fn(),
    };
    const expenseService = new ExpenseService(mockExpenseRepo as unknown as IExpenseRepository);
    const expense = Expense.create({
      workspaceId: 'ws-1',
      userId: 'u-1',
      title: 'Coffee',
      amount: Money.create(5, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });
    mockExpenseRepo.findById.mockResolvedValue(expense);

    await expenseService.deleteExpense(expense.id.getValue(), 'ws-1', 'u-1');

    expect(mockExpenseRepo.delete).toHaveBeenCalledWith(
      expect.any(ExpenseId),
      'ws-1',
      expense
    );
  });

  it('loads entity inside transaction and writes to outbox when delete is called without entity', async () => {
    const { rootPrisma, mockTx } = createMockPrisma();
    const repo = new ExpenseRepositoryImpl(rootPrisma, mockEventBus);
    const expenseId = ExpenseId.create();

    mockTx.expense.findFirst.mockResolvedValue({
      id: expenseId.getValue(),
      workspaceId: 'ws-999',
      userId: 'user-999',
      title: 'Lunch',
      amount: 25,
      currency: 'USD',
      expenseDate: new Date(),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
      status: 'DRAFT',
      tags: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repo.delete(expenseId, 'ws-999');

    expect(mockTx.expense.findFirst).toHaveBeenCalledWith({
      where: { id: expenseId.getValue(), workspaceId: 'ws-999' },
      include: { category: true, tags: true, attachments: true },
    });
    expect(mockTx.expense.delete).toHaveBeenCalledWith({
      where: { id: expenseId.getValue(), workspaceId: 'ws-999' },
    });
    expect(mockTx.outboxEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          aggregateId: expenseId.getValue(),
          eventType: 'expense.deleted',
          status: 'PENDING',
        }),
      ]),
      skipDuplicates: true,
    });
  });
});
