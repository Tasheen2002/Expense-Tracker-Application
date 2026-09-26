import { describe, it, expect, vi } from 'vitest';
import { GetExpenseHandler } from '../application/queries/get-expense.query';
import { FilterExpensesHandler } from '../application/queries/filter-expenses.query';
import { GetExpenseStatisticsHandler } from '../application/queries/get-expense-statistics.query';
import { GetCategoryHandler } from '../application/queries/get-category.query';
import { ListCategoriesHandler } from '../application/queries/list-categories.query';
import { GetTagHandler } from '../application/queries/get-tag.query';
import { ListTagsHandler } from '../application/queries/list-tags.query';
import { GetAttachmentHandler } from '../application/queries/get-attachment.query';
import { ListAttachmentsHandler } from '../application/queries/list-attachments.query';
import { GetSplitHandler } from '../application/queries/get-split.query';
import { GetSplitByExpenseHandler } from '../application/queries/get-split-by-expense.query';
import { ListUserSplitsHandler } from '../application/queries/list-user-splits.query';
import { GetSplitSettlementsHandler } from '../application/queries/get-split-settlements.query';
import { ListUserSettlementsHandler } from '../application/queries/list-user-settlements.query';

import {
  ExpenseNotFoundError,
  CategoryNotFoundError,
  TagNotFoundError,
  AttachmentNotFoundError,
  UnauthorizedExpenseAccessError,
  CurrencyRequiredError,
} from '../domain/errors/expense.errors';
import { SettlementStatus } from '../domain/enums/settlement-status';
import { OperationService } from '../application/services/operation.service';
import { ExpenseService } from '../application/services/expense.service';
import { CategoryService } from '../application/services/category.service';
import { TagService } from '../application/services/tag.service';
import { AttachmentService } from '../application/services/attachment.service';
import { ExpenseSplitService } from '../application/services/expense-split.service';
import { IWorkspaceAuthorizationPort } from '../application/ports/workspace-authorization.port';

describe('Expense-Ledger CQRS Query Handlers Unit Tests', () => {
  const dummyUUID = '11111111-1111-4111-8111-111111111111';
  const dummyUUID2 = '22222222-2222-4222-8222-222222222222';

  describe('1. GetExpenseHandler', () => {
    const mockWorkspaceAuth: IWorkspaceAuthorizationPort = {
      authorize: vi.fn().mockImplementation(async ({ userId, workspaceId, requiredRole }: { userId: string; workspaceId: string; requiredRole?: any }) => ({
        userId,
        workspaceId,
        role: requiredRole || (userId.includes('admin') ? 'ADMIN' : 'MEMBER'),
      })),
    };
    const operationService = new OperationService(mockWorkspaceAuth);

    it('returns expense DTO when found and authorized as owner', async () => {
      const dummyExpense = { id: dummyUUID, userId: 'user-owner', title: 'Flight' };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(dummyExpense),
      };
      const handler = new GetExpenseHandler(mockExpenseService as unknown as ExpenseService, operationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-owner',
      });

      expect(mockExpenseService.getExpenseById).toHaveBeenCalledWith(dummyUUID, 'ws-1');
      expect(result).toEqual(dummyExpense);
    });

    it('returns expense DTO when caller is an admin even if not the owner', async () => {
      const dummyExpense = { id: dummyUUID, userId: 'user-owner', title: 'Flight' };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(dummyExpense),
      };
      const handler = new GetExpenseHandler(mockExpenseService as unknown as ExpenseService, operationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-admin',
        role: 'ADMIN',
        verifiedMembership: {
          userId: 'user-admin',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });

      expect(result).toEqual(dummyExpense);
    });

    it('throws UnauthorizedExpenseAccessError when caller is not the owner and lacks elevated role', async () => {
      const dummyExpense = { id: dummyUUID, userId: 'user-owner', title: 'Flight' };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(dummyExpense),
      };
      const handler = new GetExpenseHandler(mockExpenseService as unknown as ExpenseService, operationService);

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-other',
          role: 'MEMBER',
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
    });

    it('throws ExpenseNotFoundError when expense not found', async () => {
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(null),
      };
      const handler = new GetExpenseHandler(mockExpenseService as unknown as ExpenseService, operationService);

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-owner',
        })
      ).rejects.toThrow(ExpenseNotFoundError);
    });
  });

  describe('2. FilterExpensesHandler', () => {
    const mockWorkspaceAuth: IWorkspaceAuthorizationPort = {
      authorize: vi.fn().mockImplementation(async ({ userId, workspaceId, requiredRole }: { userId: string; workspaceId: string; requiredRole?: any }) => ({
        userId,
        workspaceId,
        role: requiredRole || (userId.includes('admin') ? 'ADMIN' : 'MEMBER'),
      })),
    };
    const operationService = new OperationService(mockWorkspaceAuth);

    it('restricts standard member to their own user ID when none specified', async () => {
      const dummyResult = { items: [{ id: dummyUUID }], total: 1, limit: 10, offset: 0, hasMore: false };
      const mockExpenseService = {
        getExpensesWithFilters: vi.fn().mockResolvedValue(dummyResult),
      };
      const handler = new FilterExpensesHandler(mockExpenseService as unknown as ExpenseService, operationService);

      const result = await handler.handle({
        workspaceId: 'ws-1',
        actorId: 'user-member-1',
        role: 'MEMBER',
        limit: 10,
        offset: 0,
      });

      expect(mockExpenseService.getExpensesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'user-member-1',
        }),
        { limit: 10, offset: 0 }
      );
      expect(result).toEqual(dummyResult);
    });

    it('rejects ordinary member attempting to filter expenses of another member', async () => {
      const mockExpenseService = {
        getExpensesWithFilters: vi.fn(),
      };
      const handler = new FilterExpensesHandler(mockExpenseService as unknown as ExpenseService, operationService);

      await expect(
        handler.handle({
          workspaceId: 'ws-1',
          actorId: 'user-member-1',
          userId: 'user-member-2',
          role: 'MEMBER',
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
      expect(mockExpenseService.getExpensesWithFilters).not.toHaveBeenCalled();
    });

    it('permits elevated role (ADMIN) to filter expenses of another user or workspace-wide', async () => {
      const dummyResult = { items: [{ id: dummyUUID }], total: 1, limit: 10, offset: 0, hasMore: false };
      const mockExpenseService = {
        getExpensesWithFilters: vi.fn().mockResolvedValue(dummyResult),
      };
      const handler = new FilterExpensesHandler(mockExpenseService as unknown as ExpenseService, operationService);

      // Filtering another user
      await handler.handle({
        workspaceId: 'ws-1',
        actorId: 'user-admin',
        userId: 'user-member-2',
        role: 'ADMIN',
        verifiedMembership: {
          userId: 'user-admin',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });
      expect(mockExpenseService.getExpensesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'user-member-2',
        }),
        { limit: undefined, offset: undefined }
      );

      // Filtering workspace-wide (no userId)
      await handler.handle({
        workspaceId: 'ws-1',
        actorId: 'user-admin',
        role: 'ADMIN',
        verifiedMembership: {
          userId: 'user-admin',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });
      expect(mockExpenseService.getExpensesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: undefined,
        }),
        { limit: undefined, offset: undefined }
      );
    });
  });

  describe('3. GetExpenseStatisticsHandler', () => {
    const mockWorkspaceAuth: IWorkspaceAuthorizationPort = {
      authorize: vi.fn().mockImplementation(async ({ userId, workspaceId, requiredRole }: { userId: string; workspaceId: string; requiredRole?: any }) => ({
        userId,
        workspaceId,
        role: requiredRole || (userId.includes('admin') ? 'ADMIN' : 'MEMBER'),
      })),
    };
    const operationService = new OperationService(mockWorkspaceAuth);

    it('returns aggregated expense statistics scoped to member ID for ordinary member', async () => {
      const dummyStats = {
        totalAmount: 1500,
        currency: 'USD',
        countByStatus: {
          DRAFT: 2,
          SUBMITTED: 3,
          APPROVED: 5,
          REJECTED: 1,
          REIMBURSED: 1,
        },
      };
      const mockExpenseService = {
        getExpenseStatistics: vi.fn().mockResolvedValue(dummyStats),
      };
      const handler = new GetExpenseStatisticsHandler(mockExpenseService as unknown as ExpenseService, operationService);

      const result = await handler.handle({
        workspaceId: 'ws-1',
        actorId: 'user-member-1',
        role: 'MEMBER',
        currency: 'USD',
      });

      expect(mockExpenseService.getExpenseStatistics).toHaveBeenCalledWith('ws-1', 'user-member-1', 'USD');
      expect(result.totalExpense).toBe(1500);
      expect(result.totalCount).toBe(12);
      expect(result.expenseCountByStatus.approved).toBe(5);
    });

    it('throws CurrencyRequiredError when currency parameter is missing', async () => {
      const mockExpenseService = {
        getExpenseStatistics: vi.fn(),
      };
      const handler = new GetExpenseStatisticsHandler(mockExpenseService as unknown as ExpenseService, operationService);

      await expect(
        handler.handle({
          workspaceId: 'ws-1',
          actorId: 'user-member-1',
          role: 'MEMBER',
        })
      ).rejects.toThrow(CurrencyRequiredError);
      expect(mockExpenseService.getExpenseStatistics).not.toHaveBeenCalled();
    });

    it('rejects ordinary member attempting to view statistics of another member', async () => {
      const mockExpenseService = {
        getExpenseStatistics: vi.fn(),
      };
      const handler = new GetExpenseStatisticsHandler(mockExpenseService as unknown as ExpenseService, operationService);

      await expect(
        handler.handle({
          workspaceId: 'ws-1',
          actorId: 'user-member-1',
          userId: 'user-member-2',
          role: 'MEMBER',
          currency: 'USD',
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
      expect(mockExpenseService.getExpenseStatistics).not.toHaveBeenCalled();
    });

    it('permits elevated role (ADMIN) to view statistics workspace-wide or for another user', async () => {
      const dummyStats = {
        totalAmount: 5000,
        currency: 'USD',
        countByStatus: { DRAFT: 0, SUBMITTED: 1, APPROVED: 2, REJECTED: 0, REIMBURSED: 0 },
      };
      const mockExpenseService = {
        getExpenseStatistics: vi.fn().mockResolvedValue(dummyStats),
      };
      const handler = new GetExpenseStatisticsHandler(mockExpenseService as unknown as ExpenseService, operationService);

      await handler.handle({
        workspaceId: 'ws-1',
        actorId: 'user-admin',
        role: 'ADMIN',
        currency: 'USD',
        verifiedMembership: {
          userId: 'user-admin',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });
      expect(mockExpenseService.getExpenseStatistics).toHaveBeenCalledWith('ws-1', undefined, 'USD');

      await handler.handle({
        workspaceId: 'ws-1',
        actorId: 'user-admin',
        userId: 'user-member-2',
        role: 'ADMIN',
        currency: 'USD',
        verifiedMembership: {
          userId: 'user-admin',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });
      expect(mockExpenseService.getExpenseStatistics).toHaveBeenCalledWith('ws-1', 'user-member-2', 'USD');
    });

    it('throws error when OperationService or ExpenseService dependency is missing', () => {
      expect(() => new GetExpenseStatisticsHandler(null as never, operationService)).toThrow();
      expect(() => new GetExpenseStatisticsHandler({} as never, null as never)).toThrow();
    });
  });

  describe('4. GetCategoryHandler', () => {
    it('returns category when found', async () => {
      const dummyCategory = { id: dummyUUID, name: 'Travel' };
      const mockCategoryService = {
        getCategoryById: vi.fn().mockResolvedValue(dummyCategory),
      };
      const handler = new GetCategoryHandler(mockCategoryService as unknown as CategoryService);

      const result = await handler.handle({
        categoryId: dummyUUID,
        workspaceId: 'ws-1',
      });

      expect(mockCategoryService.getCategoryById).toHaveBeenCalledWith(dummyUUID, 'ws-1');
      expect(result).toEqual(dummyCategory);
    });

    it('throws CategoryNotFoundError when category not found', async () => {
      const mockCategoryService = {
        getCategoryById: vi.fn().mockResolvedValue(null),
      };
      const handler = new GetCategoryHandler(mockCategoryService as unknown as CategoryService);

      await expect(
        handler.handle({
          categoryId: dummyUUID,
          workspaceId: 'ws-1',
        })
      ).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe('5. ListCategoriesHandler', () => {
    it('returns paginated categories', async () => {
      const dummyCategories = { items: [{ id: dummyUUID, name: 'Travel' }], total: 1, limit: 10, offset: 0 };
      const mockCategoryService = {
        getCategoriesByWorkspace: vi.fn().mockResolvedValue(dummyCategories),
        getActiveCategoriesByWorkspace: vi.fn().mockResolvedValue(dummyCategories),
      };
      const handler = new ListCategoriesHandler(mockCategoryService as unknown as CategoryService);

      const result = await handler.handle({
        workspaceId: 'ws-1',
        limit: 10,
        offset: 0,
      });

      expect(mockCategoryService.getCategoriesByWorkspace).toHaveBeenCalledWith('ws-1', { limit: 10, offset: 0 });
      expect(result).toEqual(dummyCategories);
    });

    it('returns active categories when activeOnly is true', async () => {
      const dummyCategories = { items: [{ id: dummyUUID, name: 'Active Cat' }], total: 1, limit: 10, offset: 0 };
      const mockCategoryService = {
        getCategoriesByWorkspace: vi.fn().mockResolvedValue(dummyCategories),
        getActiveCategoriesByWorkspace: vi.fn().mockResolvedValue(dummyCategories),
      };
      const handler = new ListCategoriesHandler(mockCategoryService as unknown as CategoryService);

      const result = await handler.handle({
        workspaceId: 'ws-1',
        activeOnly: true,
        limit: 10,
        offset: 0,
      });

      expect(mockCategoryService.getActiveCategoriesByWorkspace).toHaveBeenCalledWith('ws-1', { limit: 10, offset: 0 });
      expect(result).toEqual(dummyCategories);
    });
  });

  describe('6. GetTagHandler', () => {
    it('returns tag when found', async () => {
      const dummyTag = { id: dummyUUID, name: 'Urgent' };
      const mockTagService = {
        getTagById: vi.fn().mockResolvedValue(dummyTag),
      };
      const handler = new GetTagHandler(mockTagService as unknown as TagService);

      const result = await handler.handle({
        tagId: dummyUUID,
        workspaceId: 'ws-1',
      });

      expect(mockTagService.getTagById).toHaveBeenCalledWith(dummyUUID, 'ws-1');
      expect(result).toEqual(dummyTag);
    });

    it('throws TagNotFoundError when tag not found', async () => {
      const mockTagService = {
        getTagById: vi.fn().mockResolvedValue(null),
      };
      const handler = new GetTagHandler(mockTagService as unknown as TagService);

      await expect(
        handler.handle({
          tagId: dummyUUID,
          workspaceId: 'ws-1',
        })
      ).rejects.toThrow(TagNotFoundError);
    });
  });

  describe('7. ListTagsHandler', () => {
    it('returns paginated tags', async () => {
      const dummyTags = { items: [{ id: dummyUUID, name: 'Urgent' }], total: 1, limit: 10, offset: 0 };
      const mockTagService = {
        getTagsByWorkspace: vi.fn().mockResolvedValue(dummyTags),
      };
      const handler = new ListTagsHandler(mockTagService as unknown as TagService);

      const result = await handler.handle({
        workspaceId: 'ws-1',
        limit: 10,
        offset: 0,
      });

      expect(mockTagService.getTagsByWorkspace).toHaveBeenCalledWith('ws-1', { limit: 10, offset: 0 });
      expect(result).toEqual(dummyTags);
    });
  });

  describe('8. GetAttachmentHandler', () => {
    const mockExpense = {
      expenseId: dummyUUID2,
      workspaceId: 'ws-1',
      userId: 'user-owner',
      title: 'Business Lunch',
    };
    const mockExpenseService = {
      getExpenseById: vi.fn().mockResolvedValue(mockExpense),
    };
    const mockWorkspaceAuth: IWorkspaceAuthorizationPort = {
      authorize: vi.fn().mockImplementation(async ({ userId, workspaceId, requiredRole }: { userId: string; workspaceId: string; requiredRole?: any }) => ({
        userId,
        workspaceId,
        role: requiredRole || (userId.includes('admin') ? 'ADMIN' : 'MEMBER'),
      })),
    };
    const operationService = new OperationService(mockWorkspaceAuth);

    it('returns attachment when found, belongs to expense, and caller is expense owner', async () => {
      const dummyAttachment = {
        id: dummyUUID,
        expenseId: dummyUUID2,
        fileName: 'receipt.pdf',
      };
      const mockAttachmentService = {
        getAttachmentDTOById: vi.fn().mockResolvedValue(dummyAttachment),
      };
      const handler = new GetAttachmentHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockExpenseService as unknown as ExpenseService,
        operationService
      );

      const result = await handler.handle({
        attachmentId: dummyUUID,
        expenseId: dummyUUID2,
        workspaceId: 'ws-1',
        userId: 'user-owner',
        role: 'MEMBER',
      });

      expect(mockAttachmentService.getAttachmentDTOById).toHaveBeenCalledWith(dummyUUID, 'ws-1');
      expect(result).toEqual(dummyAttachment);
    });

    it('rejects ordinary member attempting to read another member attachment', async () => {
      const dummyAttachment = {
        id: dummyUUID,
        expenseId: dummyUUID2,
        fileName: 'receipt.pdf',
      };
      const mockAttachmentService = {
        getAttachmentDTOById: vi.fn().mockResolvedValue(dummyAttachment),
      };
      const handler = new GetAttachmentHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockExpenseService as unknown as ExpenseService,
        operationService
      );

      await expect(
        handler.handle({
          attachmentId: dummyUUID,
          expenseId: dummyUUID2,
          workspaceId: 'ws-1',
          userId: 'user-stranger',
          role: 'MEMBER',
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
      expect(mockAttachmentService.getAttachmentDTOById).not.toHaveBeenCalled();
    });

    it('permits privileged role (ADMIN) to read another member attachment', async () => {
      const dummyAttachment = {
        id: dummyUUID,
        expenseId: dummyUUID2,
        fileName: 'receipt.pdf',
      };
      const mockAttachmentService = {
        getAttachmentDTOById: vi.fn().mockResolvedValue(dummyAttachment),
      };
      const handler = new GetAttachmentHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockExpenseService as unknown as ExpenseService,
        operationService
      );

      const result = await handler.handle({
        attachmentId: dummyUUID,
        expenseId: dummyUUID2,
        workspaceId: 'ws-1',
        userId: 'user-admin',
        role: 'ADMIN',
        verifiedMembership: {
          userId: 'user-admin',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });

      expect(result).toEqual(dummyAttachment);
    });

    it('throws ExpenseNotFoundError when parent expense not found', async () => {
      const mockMissingExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(null),
      };
      const mockAttachmentService = {
        getAttachmentDTOById: vi.fn(),
      };
      const handler = new GetAttachmentHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockMissingExpenseService as unknown as ExpenseService,
        operationService
      );

      await expect(
        handler.handle({
          attachmentId: dummyUUID,
          expenseId: 'missing-expense',
          workspaceId: 'ws-1',
          userId: 'user-owner',
          role: 'MEMBER',
        })
      ).rejects.toThrow(ExpenseNotFoundError);
    });

    it('throws AttachmentNotFoundError when attachment not found', async () => {
      const mockAttachmentService = {
        getAttachmentDTOById: vi.fn().mockResolvedValue(null),
      };
      const handler = new GetAttachmentHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockExpenseService as unknown as ExpenseService,
        operationService
      );

      await expect(
        handler.handle({
          attachmentId: dummyUUID,
          expenseId: dummyUUID2,
          workspaceId: 'ws-1',
          userId: 'user-owner',
          role: 'MEMBER',
        })
      ).rejects.toThrow(AttachmentNotFoundError);
    });

    it('throws AttachmentNotFoundError when attachment belongs to a different expense', async () => {
      const dummyAttachment = {
        id: dummyUUID,
        expenseId: 'different-expense',
        fileName: 'receipt.pdf',
      };
      const mockAttachmentService = {
        getAttachmentDTOById: vi.fn().mockResolvedValue(dummyAttachment),
      };
      const handler = new GetAttachmentHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockExpenseService as unknown as ExpenseService,
        operationService
      );

      await expect(
        handler.handle({
          attachmentId: dummyUUID,
          expenseId: dummyUUID2,
          workspaceId: 'ws-1',
          userId: 'user-owner',
          role: 'MEMBER',
        })
      ).rejects.toThrow(AttachmentNotFoundError);
    });
  });

  describe('9. ListAttachmentsHandler', () => {
    const mockExpense = {
      expenseId: dummyUUID,
      workspaceId: 'ws-1',
      userId: 'user-owner',
      title: 'Business Lunch',
    };
    const mockExpenseService = {
      getExpenseById: vi.fn().mockResolvedValue(mockExpense),
    };
    const mockWorkspaceAuth = {
      authorize: vi.fn().mockImplementation(async ({ userId, workspaceId, role }: { userId: string; workspaceId: string; role?: string }) => ({
        userId,
        workspaceId,
        role: role || 'MEMBER',
      })),
    };
    const operationService = new OperationService(mockWorkspaceAuth as unknown as IWorkspaceAuthorizationPort);

    it('returns paginated attachments when caller is authorized', async () => {
      const dummyAttachments = {
        items: [{ id: dummyUUID, fileName: 'receipt.pdf' }],
        total: 1,
        limit: 10,
        offset: 0,
      };
      const mockAttachmentService = {
        getAttachmentDTOsByExpense: vi.fn().mockResolvedValue(dummyAttachments),
      };
      const handler = new ListAttachmentsHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockExpenseService as unknown as ExpenseService,
        operationService
      );

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-owner',
        role: 'MEMBER',
        limit: 10,
        offset: 0,
      });

      expect(mockAttachmentService.getAttachmentDTOsByExpense).toHaveBeenCalledWith(
        dummyUUID,
        'ws-1',
        { limit: 10, offset: 0 }
      );
      expect(result).toEqual(dummyAttachments);
    });

    it('rejects ordinary member attempting to list attachments of another member expense', async () => {
      const mockAttachmentService = {
        getAttachmentDTOsByExpense: vi.fn(),
      };
      const handler = new ListAttachmentsHandler(
        mockAttachmentService as unknown as AttachmentService,
        mockExpenseService as unknown as ExpenseService,
        operationService
      );

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-stranger',
          role: 'MEMBER',
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
      expect(mockAttachmentService.getAttachmentDTOsByExpense).not.toHaveBeenCalled();
    });
  });

  describe('10. GetSplitHandler', () => {
    it('retrieves split by id with user authorization', async () => {
      const dummySplit = { id: dummyUUID, paidBy: 'user-1' };
      const mockSplitService = {
        getSplitById: vi.fn().mockResolvedValue(dummySplit),
      };
      const handler = new GetSplitHandler(mockSplitService as unknown as ExpenseSplitService);

      const result = await handler.handle({
        splitId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockSplitService.getSplitById).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result).toEqual(dummySplit);
    });
  });

  describe('11. GetSplitByExpenseHandler', () => {
    it('retrieves split by expenseId', async () => {
      const dummySplit = { id: dummyUUID, expenseId: dummyUUID2 };
      const mockSplitService = {
        getSplitByExpenseId: vi.fn().mockResolvedValue(dummySplit),
      };
      const handler = new GetSplitByExpenseHandler(mockSplitService as unknown as ExpenseSplitService);

      const result = await handler.handle({
        expenseId: dummyUUID2,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockSplitService.getSplitByExpenseId).toHaveBeenCalledWith(dummyUUID2, 'ws-1', 'user-1');
      expect(result).toEqual(dummySplit);
    });
  });

  describe('12. ListUserSplitsHandler', () => {
    it('lists user splits with pagination', async () => {
      const dummySplits = { items: [{ id: dummyUUID }], total: 1, limit: 10, offset: 0 };
      const mockSplitService = {
        listUserSplits: vi.fn().mockResolvedValue(dummySplits),
      };
      const handler = new ListUserSplitsHandler(mockSplitService as unknown as ExpenseSplitService);

      const result = await handler.handle({
        userId: 'user-1',
        workspaceId: 'ws-1',
        limit: 10,
        offset: 0,
      });

      expect(mockSplitService.listUserSplits).toHaveBeenCalledWith('user-1', 'ws-1', {
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual(dummySplits);
    });
  });

  describe('13. GetSplitSettlementsHandler', () => {
    it('retrieves settlements for split', async () => {
      const dummySettlements = { items: [{ id: dummyUUID }], total: 1, limit: 10, offset: 0 };
      const mockSplitService = {
        getSplitSettlements: vi.fn().mockResolvedValue(dummySettlements),
      };
      const handler = new GetSplitSettlementsHandler(mockSplitService as unknown as ExpenseSplitService);

      const result = await handler.handle({
        splitId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockSplitService.getSplitSettlements).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result).toEqual(dummySettlements);
    });
  });

  describe('14. ListUserSettlementsHandler', () => {
    it('lists user settlements with status filter and pagination', async () => {
      const dummySettlements = { items: [{ id: dummyUUID, status: SettlementStatus.PENDING }], total: 1, limit: 10, offset: 0 };
      const mockSplitService = {
        getUserSettlements: vi.fn().mockResolvedValue(dummySettlements),
      };
      const handler = new ListUserSettlementsHandler(mockSplitService as unknown as ExpenseSplitService);

      const result = await handler.handle({
        userId: 'user-1',
        workspaceId: 'ws-1',
        status: SettlementStatus.PENDING,
        limit: 10,
        offset: 0,
      });

      expect(mockSplitService.getUserSettlements).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        SettlementStatus.PENDING,
        { limit: 10, offset: 0 }
      );
      expect(result).toEqual(dummySettlements);
    });
  });
});
