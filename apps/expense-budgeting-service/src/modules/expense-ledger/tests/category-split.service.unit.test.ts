import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryService } from '../application/services/category.service';
import { ICategoryRepository } from '../domain/repositories/category.repository';
import { ICacheService } from '@core/domain/interfaces/cache.interface';
import { Category } from '../domain/entities/category.entity';
import { ExpenseSplitService } from '../application/services/expense-split.service';
import { IExpenseSplitRepository } from '../domain/repositories/expense-split.repository';
import { ISplitSettlementRepository } from '../domain/repositories/split-settlement.repository';
import { IExpenseRepository } from '../domain/repositories/expense.repository';
import { SplitSettlement } from '../domain/entities/split-settlement.entity';
import { ExpenseSplit } from '../domain/entities/expense-split.entity';
import { SplitId } from '../domain/value-objects/split-id';
import { ExpenseId } from '../domain/value-objects/expense-id';
import { Money } from '../domain/value-objects/money';
import { SplitType } from '../domain/enums/split-type';
import { UnauthorizedSplitAccessError } from '../domain/errors/split-expense.errors';
import { IUnitOfWork } from '../application/ports/unit-of-work.port';

describe('CategoryService & ExpenseSplitService Unit Tests', () => {
  describe('CategoryService Tenant-Scoped Caching', () => {
    let categoryService: CategoryService;
    let mockCategoryRepo: Partial<ICategoryRepository>;
    let mockCacheService: {
      getOrSet: any;
      delete: any;
      deletePattern: any;
    };

    beforeEach(() => {
      mockCategoryRepo = {
        findById: vi.fn(),
        findByName: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      mockCacheService = {
        getOrSet: vi.fn(),
        delete: vi.fn(),
        deletePattern: vi.fn(),
      };
      categoryService = new CategoryService(
        mockCategoryRepo as ICategoryRepository,
        mockCacheService as unknown as ICacheService
      );
    });

    it('scopes cache key by workspaceId on getCategoryById', async () => {
      const cat = Category.create({
        workspaceId: 'ws-tenant-1',
        name: 'Supplies',
        isActive: true,
      });

      mockCacheService.getOrSet.mockImplementation(
        async (_key: string, factory: () => Promise<unknown>) => {
          return factory();
        }
      );
      vi.mocked(mockCategoryRepo.findById!).mockResolvedValue(cat);

      const result = await categoryService.getCategoryById(
        cat.id.getValue(),
        'ws-tenant-1'
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Supplies');
      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        `workspace:ws-tenant-1:category:${cat.id.getValue()}`,
        expect.any(Function),
        300
      );
    });

    it('invalidates workspace-scoped cache key on updateCategory', async () => {
      const cat = Category.create({
        workspaceId: 'ws-tenant-1',
        name: 'Old Name',
        isActive: true,
      });

      vi.mocked(mockCategoryRepo.findById!).mockResolvedValue(cat);

      await categoryService.updateCategory(cat.id.getValue(), 'ws-tenant-1', {
        name: 'New Name',
      });

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `workspace:ws-tenant-1:category:${cat.id.getValue()}`
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        'workspace:ws-tenant-1:categories*'
      );
    });
  });

  describe('ExpenseSplitService Payment Recording & Authorization', () => {
    let splitService: ExpenseSplitService;
    let mockSplitRepo: Partial<IExpenseSplitRepository>;
    let mockSettlementRepo: Partial<ISplitSettlementRepository>;
    let mockExpenseRepo: Partial<IExpenseRepository>;
    let mockUnitOfWork: IUnitOfWork;

    beforeEach(() => {
      mockSplitRepo = {
        save: vi.fn(),
        findById: vi.fn(),
        delete: vi.fn(),
        exists: vi.fn().mockResolvedValue(false),
      };
      mockSettlementRepo = {
        save: vi.fn(),
        findById: vi.fn(),
        findByIdForUpdate: vi.fn(),
      };
      mockExpenseRepo = {
        findById: vi.fn(),
        update: vi.fn(),
      };
      mockUnitOfWork = {
        execute: vi.fn().mockImplementation(async <T>(work: () => Promise<T>): Promise<T> => work()),
      };
      splitService = new ExpenseSplitService(
        mockSplitRepo as IExpenseSplitRepository,
        mockSettlementRepo as ISplitSettlementRepository,
        mockExpenseRepo as IExpenseRepository,
        mockUnitOfWork
      );
    });

    it('creates split and settlements atomically inside unit of work', async () => {
      const expenseId = ExpenseId.create();
      const result = await splitService.createSplit({
        expenseId: expenseId.getValue(),
        workspaceId: 'ws-1',
        userId: 'user-creditor',
        totalAmount: Money.create(100, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'user-creditor' },
          { userId: 'user-debtor' },
        ],
      });

      expect(mockUnitOfWork.execute).toHaveBeenCalled();
      expect(mockSplitRepo.save).toHaveBeenCalled();
      expect(mockSettlementRepo.save).toHaveBeenCalled();
      expect(result.paidBy).toBe('user-creditor');
    });

    it('allows debtor (fromUserId) to record payment and marks debtor as paid', async () => {
      const splitId = SplitId.create();
      const settlement = SplitSettlement.create({
        splitId,
        fromUserId: 'user-debtor',
        toUserId: 'user-creditor',
        owedAmount: Money.create(50, 'USD'),
      });

      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'ws-1',
        paidBy: 'user-creditor',
        totalAmount: Money.create(100, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'user-creditor' },
          { userId: 'user-debtor' },
        ],
      });

      vi.mocked(mockSettlementRepo.findByIdForUpdate!).mockResolvedValue(settlement);
      vi.mocked(mockSettlementRepo.findById!).mockResolvedValue(settlement);
      vi.mocked(mockSplitRepo.findById!).mockResolvedValue(split);

      const result = await splitService.recordPayment({
        settlementId: settlement.id.getValue(),
        workspaceId: 'ws-1',
        userId: 'user-debtor',
        amount: 50,
      });

      expect(result.status).toBe('SETTLED');
      const debtorPart = split.participants.find((p) => p.userId === 'user-debtor');
      expect(debtorPart?.isPaid).toBe(true);
      expect(mockSettlementRepo.save).toHaveBeenCalled();
      expect(mockSplitRepo.save).toHaveBeenCalled();
    });

    it('allows creditor (toUserId) to record payment on behalf of debtor', async () => {
      const splitId = SplitId.create();
      const settlement = SplitSettlement.create({
        splitId,
        fromUserId: 'user-debtor',
        toUserId: 'user-creditor',
        owedAmount: Money.create(50, 'USD'),
      });

      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'ws-1',
        paidBy: 'user-creditor',
        totalAmount: Money.create(100, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'user-creditor' },
          { userId: 'user-debtor' },
        ],
      });

      vi.mocked(mockSettlementRepo.findByIdForUpdate!).mockResolvedValue(settlement);
      vi.mocked(mockSettlementRepo.findById!).mockResolvedValue(settlement);
      vi.mocked(mockSplitRepo.findById!).mockResolvedValue(split);

      const result = await splitService.recordPayment({
        settlementId: settlement.id.getValue(),
        workspaceId: 'ws-1',
        userId: 'user-creditor',
        amount: 50,
      });

      expect(result.status).toBe('SETTLED');
      const debtorPart = split.participants.find((p) => p.userId === 'user-debtor');
      expect(debtorPart?.isPaid).toBe(true);
    });

    it('rejects third party with UnauthorizedSplitAccessError', async () => {
      const splitId = SplitId.create();
      const settlement = SplitSettlement.create({
        splitId,
        fromUserId: 'user-debtor',
        toUserId: 'user-creditor',
        owedAmount: Money.create(50, 'USD'),
      });

      vi.mocked(mockSettlementRepo.findByIdForUpdate!).mockResolvedValue(settlement);
      vi.mocked(mockSettlementRepo.findById!).mockResolvedValue(settlement);

      await expect(
        splitService.recordPayment({
          settlementId: settlement.id.getValue(),
          workspaceId: 'ws-1',
          userId: 'random-stranger',
          amount: 50,
        })
      ).rejects.toThrow(UnauthorizedSplitAccessError);
    });

    it('serializes concurrent payments using findByIdForUpdate inside unit of work', async () => {
      const splitId = SplitId.create();
      const settlement = SplitSettlement.create({
        splitId,
        fromUserId: 'user-debtor',
        toUserId: 'user-creditor',
        owedAmount: Money.create(100, 'USD'),
      });

      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'ws-1',
        paidBy: 'user-creditor',
        totalAmount: Money.create(100, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'user-creditor' },
          { userId: 'user-debtor' },
        ],
      });

      vi.mocked(mockSettlementRepo.findByIdForUpdate!).mockResolvedValue(settlement);
      vi.mocked(mockSplitRepo.findById!).mockResolvedValue(split);

      // Perform two payments in sequence as they would under serialized row lock
      const p1 = await splitService.recordPayment({
        settlementId: settlement.id.getValue(),
        workspaceId: 'ws-1',
        userId: 'user-debtor',
        amount: 40,
      });

      expect(Number(p1.paidAmount)).toBe(40);
      expect(p1.status).toBe('PARTIAL');

      const p2 = await splitService.recordPayment({
        settlementId: settlement.id.getValue(),
        workspaceId: 'ws-1',
        userId: 'user-debtor',
        amount: 60,
      });

      expect(Number(p2.paidAmount)).toBe(100);
      expect(p2.status).toBe('SETTLED');
      expect(mockSettlementRepo.findByIdForUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('SplitSettlementRepositoryImpl', () => {
    it('uses deleteMany for idempotent deletion scoped by workspace', async () => {
      const { SplitSettlementRepositoryImpl } = await import(
        '../infrastructure/persistence/split-settlement.repository.impl'
      );
      const { SettlementId } = await import('../domain/value-objects/settlement-id');

      const mockPrisma = {
        splitSettlement: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };

      const repo = new SplitSettlementRepositoryImpl(mockPrisma as any);
      const settlementId = SettlementId.create();
      await repo.delete(settlementId, 'ws-123');

      expect(mockPrisma.splitSettlement.deleteMany).toHaveBeenCalledWith({
        where: {
          id: settlementId.getValue(),
          split: { workspaceId: 'ws-123' },
        },
      });
    });
  });
});
