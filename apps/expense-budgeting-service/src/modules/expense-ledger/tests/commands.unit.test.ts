import { describe, it, expect, vi } from 'vitest';
import { CreateExpenseHandler } from '../application/commands/create-expense.command';
import { UpdateExpenseHandler } from '../application/commands/update-expense.command';
import { DeleteExpenseHandler } from '../application/commands/delete-expense.command';
import { SubmitExpenseHandler } from '../application/commands/submit-expense.command';
import { ApproveExpenseHandler } from '../application/commands/approve-expense.command';
import { RejectExpenseHandler } from '../application/commands/reject-expense.command';
import { ReimburseExpenseHandler } from '../application/commands/reimburse-expense.command';
import { CreateCategoryHandler } from '../application/commands/create-category.command';
import { UpdateCategoryHandler } from '../application/commands/update-category.command';
import { DeleteCategoryHandler } from '../application/commands/delete-category.command';
import { CreateTagHandler } from '../application/commands/create-tag.command';
import { UpdateTagHandler } from '../application/commands/update-tag.command';
import { DeleteTagHandler } from '../application/commands/delete-tag.command';
import { CreateAttachmentHandler } from '../application/commands/create-attachment.command';
import { DeleteAttachmentHandler } from '../application/commands/delete-attachment.command';
import { CreateRecurringExpenseHandler } from '../application/commands/create-recurring-expense.command';
import { PauseRecurringExpenseHandler } from '../application/commands/pause-recurring-expense.command';
import { ResumeRecurringExpenseHandler } from '../application/commands/resume-recurring-expense.command';
import { StopRecurringExpenseHandler } from '../application/commands/stop-recurring-expense.command';
import { ProcessRecurringExpensesHandler } from '../application/commands/process-recurring-expenses.command';
import { CreateSplitHandler } from '../application/commands/create-split.command';
import { DeleteSplitHandler } from '../application/commands/delete-split.command';
import { RecordPaymentHandler } from '../application/commands/record-payment.command';
import { OperationService } from '../application/services/operation.service';
import { ExpenseService } from '../application/services/expense.service';
import { ICategoryRepository } from '../domain/repositories/category.repository';
import { IWorkspaceAuthorizationPort } from '../application/ports/workspace-authorization.port';
import { IUnitOfWork } from '../application/ports/unit-of-work.port';

import { PaymentMethod } from '../domain/enums/payment-method';
import { RecurrenceFrequency } from '../domain/enums/recurrence-frequency';
import { SplitType } from '../domain/enums/split-type';
import { SettlementStatus } from '../domain/enums/settlement-status';
import { CategoryNotFoundError, ExpenseNotFoundError, UnauthorizedExpenseAccessError } from '../domain/errors/expense.errors';
import { ExpenseStatus } from '../domain/enums/expense-status';

describe('Expense-Ledger CQRS Command Handlers Unit Tests', () => {
  const dummyUUID = '11111111-1111-4111-8111-111111111111';
  const dummyUUID2 = '22222222-2222-4222-8222-222222222222';
  const dummyExpenseDTO = {
    id: dummyUUID,
    workspaceId: 'ws-1',
    userId: 'user-1',
    title: 'Flight Ticket',
    amount: '150',
    currency: 'USD',
    status: ExpenseStatus.DRAFT,
    expenseDate: '2026-09-18',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    isReimbursable: true,
    tagIds: [],
    attachmentIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultMockAuthPort: IWorkspaceAuthorizationPort = {
    authorize: vi.fn().mockResolvedValue({
      userId: 'user-1',
      workspaceId: 'ws-1',
      role: 'ADMIN',
    }),
  };
  const defaultOperationService = new OperationService(defaultMockAuthPort);

  describe('1. CreateExpenseHandler', () => {
    it('creates an expense successfully and checks category exists', async () => {
      const mockExpenseService = {
        createExpense: vi.fn().mockResolvedValue(dummyExpenseDTO),
      };
      const mockCategoryRepo = {
        exists: vi.fn().mockResolvedValue(true),
      };

      const handler = new CreateExpenseHandler(
        mockExpenseService as unknown as ExpenseService,
        mockCategoryRepo as unknown as ICategoryRepository,
        undefined,
        defaultOperationService
      );

      const result = await handler.handle({
        workspaceId: 'ws-1',
        userId: 'user-1',
        title: 'Flight Ticket',
        amount: 150,
        currency: 'USD',
        expenseDate: new Date(),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: true,
        categoryId: dummyUUID,
        verifiedMembership: {
          userId: 'user-1',
          workspaceId: 'ws-1',
          role: 'MEMBER',
        },
      });

      expect(mockCategoryRepo.exists).toHaveBeenCalled();
      expect(mockExpenseService.createExpense).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(dummyExpenseDTO);
    });

    it('throws CategoryNotFoundError if category does not exist', async () => {
      const mockExpenseService = { createExpense: vi.fn() };
      const mockCategoryRepo = { exists: vi.fn().mockResolvedValue(false) };

      const handler = new CreateExpenseHandler(
        mockExpenseService as unknown as ExpenseService,
        mockCategoryRepo as unknown as ICategoryRepository,
        undefined,
        defaultOperationService
      );

      await expect(
        handler.handle({
          workspaceId: 'ws-1',
          userId: 'user-1',
          title: 'Flight Ticket',
          amount: 150,
          currency: 'USD',
          expenseDate: new Date(),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          isReimbursable: true,
          categoryId: dummyUUID,
          verifiedMembership: {
            userId: 'user-1',
            workspaceId: 'ws-1',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe('2. UpdateExpenseHandler', () => {
    it('updates expense when category exists', async () => {
      const mockExpenseService = {
        updateExpense: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, title: 'Updated' }),
      };
      const mockCategoryRepo = { exists: vi.fn().mockResolvedValue(true) };

      const handler = new UpdateExpenseHandler(
        mockExpenseService as unknown as ExpenseService,
        mockCategoryRepo as unknown as ICategoryRepository,
        defaultOperationService
      );

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
        title: 'Updated',
        categoryId: dummyUUID,
        verifiedMembership: {
          userId: 'user-1',
          workspaceId: 'ws-1',
          role: 'MEMBER',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Updated');
    });

    it('throws CategoryNotFoundError when new category does not exist', async () => {
      const mockExpenseService = { updateExpense: vi.fn() };
      const mockCategoryRepo = { exists: vi.fn().mockResolvedValue(false) };

      const handler = new UpdateExpenseHandler(
        mockExpenseService as unknown as ExpenseService,
        mockCategoryRepo as unknown as ICategoryRepository,
        defaultOperationService
      );

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-1',
          categoryId: dummyUUID,
          verifiedMembership: {
            userId: 'user-1',
            workspaceId: 'ws-1',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe('3. DeleteExpenseHandler', () => {
    it('deletes expense via expenseService', async () => {
      const mockExpenseService = { deleteExpense: vi.fn().mockResolvedValue(undefined) };
      const handler = new DeleteExpenseHandler(mockExpenseService as any, defaultOperationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
        verifiedMembership: {
          userId: 'user-1',
          workspaceId: 'ws-1',
          role: 'MEMBER',
        },
      });

      expect(mockExpenseService.deleteExpense).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('4. SubmitExpenseHandler', () => {
    it('submits expense via expenseService', async () => {
      const mockExpenseService = {
        submitExpense: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, status: ExpenseStatus.SUBMITTED }),
      };
      const handler = new SubmitExpenseHandler(mockExpenseService as any, defaultOperationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
        verifiedMembership: {
          userId: 'user-1',
          workspaceId: 'ws-1',
          role: 'MEMBER',
        },
      });

      expect(mockExpenseService.submitExpense).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result.data?.status).toBe(ExpenseStatus.SUBMITTED);
    });
  });

  describe('5. ApproveExpenseHandler', () => {
    it('approves expense via expenseService', async () => {
      const mockExpenseService = {
        approveExpense: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, status: ExpenseStatus.APPROVED }),
      };
      const handler = new ApproveExpenseHandler(mockExpenseService as any, defaultOperationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        approverId: 'approver-1',
        verifiedMembership: {
          userId: 'approver-1',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });

      expect(mockExpenseService.approveExpense).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'approver-1');
      expect(result.data?.status).toBe(ExpenseStatus.APPROVED);
    });
  });

  describe('6. RejectExpenseHandler', () => {
    it('rejects expense via expenseService', async () => {
      const mockExpenseService = {
        rejectExpense: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, status: ExpenseStatus.REJECTED }),
      };
      const handler = new RejectExpenseHandler(mockExpenseService as any, defaultOperationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        rejecterId: 'rejector-1',
        reason: 'Policy violation',
        verifiedMembership: {
          userId: 'rejector-1',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });

      expect(mockExpenseService.rejectExpense).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'rejector-1', 'Policy violation');
      expect(result.data?.status).toBe(ExpenseStatus.REJECTED);
    });
  });

  describe('7. ReimburseExpenseHandler', () => {
    it('reimburses expense via expenseService', async () => {
      const mockExpenseService = {
        markExpenseAsReimbursed: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, status: ExpenseStatus.REIMBURSED }),
      };
      const handler = new ReimburseExpenseHandler(mockExpenseService as any, defaultOperationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        processedBy: 'finance-1',
        verifiedMembership: {
          userId: 'finance-1',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });

      expect(mockExpenseService.markExpenseAsReimbursed).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'finance-1');
      expect(result.data?.status).toBe(ExpenseStatus.REIMBURSED);
    });
  });

  describe('8. CreateCategoryHandler', () => {
    it('creates category via categoryService', async () => {
      const dummyCategoryDTO = { id: dummyUUID, workspaceId: 'ws-1', name: 'Travel' };
      const mockCategoryService = {
        createCategory: vi.fn().mockResolvedValue(dummyCategoryDTO),
      };
      const handler = new CreateCategoryHandler(mockCategoryService as any);

      const result = await handler.handle({
        workspaceId: 'ws-1',
        name: 'Travel',
      });

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        name: 'Travel',
      });
      expect(result.data).toEqual(dummyCategoryDTO);
    });
  });

  describe('9. UpdateCategoryHandler', () => {
    it('updates category via categoryService', async () => {
      const dummyCategoryDTO = { id: dummyUUID, workspaceId: 'ws-1', name: 'Business Travel' };
      const mockCategoryService = {
        updateCategory: vi.fn().mockResolvedValue(dummyCategoryDTO),
      };
      const handler = new UpdateCategoryHandler(mockCategoryService as any);

      const result = await handler.handle({
        categoryId: dummyUUID,
        workspaceId: 'ws-1',
        name: 'Business Travel',
      });

      expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(dummyUUID, 'ws-1', {
        name: 'Business Travel',
      });
      expect(result.data?.name).toBe('Business Travel');
    });
  });

  describe('10. DeleteCategoryHandler', () => {
    it('deletes category directly relying on ON DELETE SET NULL', async () => {
      const mockCategoryService = {
        deleteCategory: vi.fn().mockResolvedValue(undefined),
      };
      const handler = new DeleteCategoryHandler(mockCategoryService as any);

      const result = await handler.handle({
        categoryId: dummyUUID,
        workspaceId: 'ws-1',
      });

      expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith(dummyUUID, 'ws-1');
      expect(result.success).toBe(true);
    });
  });

  describe('11. CreateTagHandler', () => {
    it('creates tag via tagService', async () => {
      const dummyTag = { id: dummyUUID, workspaceId: 'ws-1', name: 'Urgent', color: '#ff0000' };
      const mockTagService = { createTag: vi.fn().mockResolvedValue(dummyTag) };
      const handler = new CreateTagHandler(mockTagService as any);

      const result = await handler.handle({
        workspaceId: 'ws-1',
        name: 'Urgent',
        color: '#ff0000',
      });

      expect(mockTagService.createTag).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        name: 'Urgent',
        color: '#ff0000',
      });
      expect(result.data).toEqual(dummyTag);
    });
  });

  describe('12. UpdateTagHandler', () => {
    it('updates tag via tagService', async () => {
      const dummyTag = { id: dummyUUID, workspaceId: 'ws-1', name: 'Priority' };
      const mockTagService = { updateTag: vi.fn().mockResolvedValue(dummyTag) };
      const handler = new UpdateTagHandler(mockTagService as any);

      const result = await handler.handle({
        tagId: dummyUUID,
        workspaceId: 'ws-1',
        name: 'Priority',
      });

      expect(mockTagService.updateTag).toHaveBeenCalledWith(dummyUUID, 'ws-1', {
        name: 'Priority',
      });
      expect(result.data?.name).toBe('Priority');
    });
  });

  describe('13. DeleteTagHandler', () => {
    it('deletes tag via tagService', async () => {
      const mockTagService = { deleteTag: vi.fn().mockResolvedValue(undefined) };
      const handler = new DeleteTagHandler(mockTagService as any);

      const result = await handler.handle({
        tagId: dummyUUID,
        workspaceId: 'ws-1',
      });

      expect(mockTagService.deleteTag).toHaveBeenCalledWith(dummyUUID, 'ws-1');
      expect(result.success).toBe(true);
    });
  });

  describe('14. CreateAttachmentHandler', () => {
    const mockUnitOfWork: IUnitOfWork = {
      execute: async <T>(work: () => Promise<T>): Promise<T> => work(),
    };
    it('creates attachment and links it to expense with user authorization', async () => {
      const dummyAttachment = { attachmentId: dummyUUID };
      const mockAttachmentService = {
        createAttachment: vi.fn().mockResolvedValue(dummyAttachment),
        deleteAttachment: vi.fn().mockResolvedValue(undefined),
      };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(dummyExpenseDTO),
        addAttachmentRecord: vi.fn().mockResolvedValue(undefined),
      };

      const handler = new CreateAttachmentHandler(
        mockAttachmentService as any,
        mockExpenseService as any,
        mockUnitOfWork
      );

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        fileName: 'receipt.pdf',
        filePath: '/files/receipt.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      });

      expect(mockExpenseService.getExpenseById).toHaveBeenCalledWith(dummyUUID, 'ws-1');
      expect(mockAttachmentService.createAttachment).toHaveBeenCalled();
      expect(mockExpenseService.addAttachmentRecord).toHaveBeenCalledWith(
        dummyUUID,
        'ws-1',
        'user-1',
        expect.anything()
      );
      expect(result.data?.attachmentId).toBe(dummyUUID);
    });

    it('rejects with ExpenseNotFoundError before creating attachment if expense does not exist', async () => {
      const mockAttachmentService = {
        createAttachment: vi.fn(),
        deleteAttachment: vi.fn(),
      };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(null),
        addAttachmentRecord: vi.fn(),
      };

      const handler = new CreateAttachmentHandler(
        mockAttachmentService as any,
        mockExpenseService as any,
        mockUnitOfWork
      );

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          fileName: 'receipt.pdf',
          filePath: '/files/receipt.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-1',
        })
      ).rejects.toThrow(ExpenseNotFoundError);

      expect(mockAttachmentService.createAttachment).not.toHaveBeenCalled();
    });

    it('rejects with UnauthorizedExpenseAccessError before creating attachment if user is not owner', async () => {
      const mockAttachmentService = {
        createAttachment: vi.fn(),
        deleteAttachment: vi.fn(),
      };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, userId: 'other-user' }),
        addAttachmentRecord: vi.fn(),
      };

      const handler = new CreateAttachmentHandler(
        mockAttachmentService as any,
        mockExpenseService as any,
        mockUnitOfWork
      );

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          fileName: 'receipt.pdf',
          filePath: '/files/receipt.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-intruder',
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);

      expect(mockAttachmentService.createAttachment).not.toHaveBeenCalled();
    });

    it('propagates linking failure so the unit of work rolls back both writes', async () => {
      const dummyAttachment = { attachmentId: dummyUUID };
      const mockAttachmentService = {
        createAttachment: vi.fn().mockResolvedValue(dummyAttachment),
        deleteAttachment: vi.fn().mockResolvedValue(undefined),
      };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(dummyExpenseDTO),
        addAttachmentRecord: vi.fn().mockRejectedValue(new Error('Linking failed')),
      };

      const handler = new CreateAttachmentHandler(
        mockAttachmentService as any,
        mockExpenseService as any,
        mockUnitOfWork
      );

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          fileName: 'receipt.pdf',
          filePath: '/files/receipt.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-1',
        })
      ).rejects.toThrow('Linking failed');

      expect(mockAttachmentService.deleteAttachment).not.toHaveBeenCalled();
    });
  });

  describe('15. DeleteAttachmentHandler', () => {
    const mockUnitOfWork: IUnitOfWork = {
      execute: async <T>(work: () => Promise<T>): Promise<T> => work(),
    };
    it('removes attachment record and deletes file with user authorization', async () => {
      const mockAttachmentService = {
        deleteAttachment: vi.fn().mockResolvedValue(undefined),
      };
      const mockExpenseService = {
        removeAttachmentRecord: vi.fn().mockResolvedValue(undefined),
      };

      const handler = new DeleteAttachmentHandler(
        mockAttachmentService as any,
        mockExpenseService as any,
        mockUnitOfWork
      );

      const result = await handler.handle({
        attachmentId: dummyUUID,
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockExpenseService.removeAttachmentRecord).toHaveBeenCalledWith(
        dummyUUID,
        'ws-1',
        'user-1',
        expect.anything()
      );
      expect(mockAttachmentService.deleteAttachment).toHaveBeenCalledWith(dummyUUID, dummyUUID, 'ws-1');
      expect(result.success).toBe(true);
    });
  });

  describe('16. CreateRecurringExpenseHandler', () => {
    const validTemplate = {
      title: 'Subscription',
      amount: 50,
      currency: 'USD',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: false,
      categoryId: dummyUUID,
    };

    it('creates recurring expense when template category exists', async () => {
      const dummyRecurring = { id: dummyUUID, workspaceId: 'ws-1' };
      const mockRecurringService = {
        createRecurringExpense: vi.fn().mockResolvedValue(dummyRecurring),
      };
      const mockCategoryRepo = {
        exists: vi.fn().mockResolvedValue(true),
      };

      const handler = new CreateRecurringExpenseHandler(
        mockRecurringService as any,
        mockCategoryRepo as any
      );

      const result = await handler.handle({
        workspaceId: 'ws-1',
        userId: 'user-1',
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date(),
        template: validTemplate,
      });

      expect(mockCategoryRepo.exists).toHaveBeenCalled();
      expect(result.data).toEqual(dummyRecurring);
    });

    it('throws CategoryNotFoundError when template category does not exist', async () => {
      const mockRecurringService = { createRecurringExpense: vi.fn() };
      const mockCategoryRepo = { exists: vi.fn().mockResolvedValue(false) };

      const handler = new CreateRecurringExpenseHandler(
        mockRecurringService as any,
        mockCategoryRepo as any
      );

      await expect(
        handler.handle({
          workspaceId: 'ws-1',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: validTemplate,
        })
      ).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe('17. PauseRecurringExpenseHandler', () => {
    it('passes userId to pauseRecurringExpense for owner authorization', async () => {
      const mockRecurringService = {
        pauseRecurringExpense: vi.fn().mockResolvedValue({ id: dummyUUID, isActive: false }),
      };
      const handler = new PauseRecurringExpenseHandler(mockRecurringService as any);

      const result = await handler.handle({
        id: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockRecurringService.pauseRecurringExpense).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('18. ResumeRecurringExpenseHandler', () => {
    it('passes userId to resumeRecurringExpense for owner authorization', async () => {
      const mockRecurringService = {
        resumeRecurringExpense: vi.fn().mockResolvedValue({ id: dummyUUID, isActive: true }),
      };
      const handler = new ResumeRecurringExpenseHandler(mockRecurringService as any);

      const result = await handler.handle({
        id: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockRecurringService.resumeRecurringExpense).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('19. StopRecurringExpenseHandler', () => {
    it('passes userId to stopRecurringExpense for owner authorization', async () => {
      const mockRecurringService = {
        stopRecurringExpense: vi.fn().mockResolvedValue(undefined),
      };
      const handler = new StopRecurringExpenseHandler(mockRecurringService as any);

      const result = await handler.handle({
        id: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockRecurringService.stopRecurringExpense).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('20. ProcessRecurringExpensesHandler', () => {
    it('processes due expenses via service', async () => {
      const mockRecurringService = {
        processDueExpenses: vi.fn().mockResolvedValue(3),
      };
      const handler = new ProcessRecurringExpensesHandler(mockRecurringService as any);

      const result = await handler.handle({
        limit: 10,
      });

      expect(mockRecurringService.processDueExpenses).toHaveBeenCalledWith(10);
      expect(result.data?.count).toBe(3);
    });
  });

  describe('21. CreateSplitHandler', () => {
    it('creates split when caller is expense owner', async () => {
      const mockSplitService = {
        createSplit: vi.fn().mockResolvedValue({ id: dummyUUID2 }),
      };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue(dummyExpenseDTO),
      };

      const handler = new CreateSplitHandler(
        mockSplitService as any,
        mockExpenseService as any
      );

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });

      expect(mockSplitService.createSplit).toHaveBeenCalled();
      expect(result.data?.splitId).toBe(dummyUUID2);
    });

    it('throws ExpenseNotFoundError if expense is missing', async () => {
      const mockSplitService = { createSplit: vi.fn() };
      const mockExpenseService = { getExpenseById: vi.fn().mockResolvedValue(null) };

      const handler = new CreateSplitHandler(
        mockSplitService as any,
        mockExpenseService as any
      );

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-1',
          splitType: SplitType.EQUAL,
          participants: [{ userId: 'user-1' }],
        })
      ).rejects.toThrow(ExpenseNotFoundError);
    });

    it('throws UnauthorizedExpenseAccessError if caller is not expense owner', async () => {
      const mockSplitService = { createSplit: vi.fn() };
      const mockExpenseService = {
        getExpenseById: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, userId: 'other-user' }),
      };

      const handler = new CreateSplitHandler(
        mockSplitService as any,
        mockExpenseService as any
      );

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-attacker',
          splitType: SplitType.EQUAL,
          participants: [{ userId: 'user-attacker' }],
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
    });
  });

  describe('22. DeleteSplitHandler', () => {
    it('deletes split with owner authorization', async () => {
      const mockSplitService = {
        deleteSplit: vi.fn().mockResolvedValue(undefined),
      };
      const handler = new DeleteSplitHandler(mockSplitService as any);

      const result = await handler.handle({
        splitId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(mockSplitService.deleteSplit).toHaveBeenCalledWith(dummyUUID, 'ws-1', 'user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('23. RecordPaymentHandler', () => {
    it('records payment and returns updated settlement', async () => {
      const dummySettlement = {
        id: dummyUUID,
        splitId: dummyUUID2,
        fromUserId: 'user-2',
        toUserId: 'user-1',
        status: SettlementStatus.SETTLED,
      };
      const mockSplitService = {
        recordPayment: vi.fn().mockResolvedValue(dummySettlement),
      };
      const handler = new RecordPaymentHandler(mockSplitService as any);

      const result = await handler.handle({
        settlementId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-2',
        amount: 75,
      });

      expect(mockSplitService.recordPayment).toHaveBeenCalledWith({
        settlementId: dummyUUID,
        workspaceId: 'ws-1',
        userId: 'user-2',
        amount: 75,
      });
      expect(result.data?.status).toBe(SettlementStatus.SETTLED);
    });
  });

  describe('24. Application-Boundary Write Authorization Enforcement', () => {
    const mockAuthPort = {
      authorize: vi.fn(),
    };
    const operationService = new OperationService(mockAuthPort as any);

    it('allows APPROVER / ADMIN / OWNER to approve an expense', async () => {
      const mockExpenseService = {
        approveExpense: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, status: ExpenseStatus.APPROVED }),
      };
      const handler = new ApproveExpenseHandler(mockExpenseService as any, operationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        approverId: 'approver-1',
        verifiedMembership: {
          userId: 'approver-1',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      });

      expect(result.data?.status).toBe(ExpenseStatus.APPROVED);
      expect(mockExpenseService.approveExpense).toHaveBeenCalled();
    });

    it('rejects approval when user has MEMBER role (insufficient rank)', async () => {
      const mockExpenseService = {
        approveExpense: vi.fn(),
      };
      const handler = new ApproveExpenseHandler(mockExpenseService as any, operationService);

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          approverId: 'member-1',
          verifiedMembership: {
            userId: 'member-1',
            workspaceId: 'ws-1',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);

      expect(mockExpenseService.approveExpense).not.toHaveBeenCalled();
    });

    it('rejects expense rejection when user has MEMBER role (insufficient rank)', async () => {
      const mockExpenseService = {
        rejectExpense: vi.fn(),
      };
      const handler = new RejectExpenseHandler(mockExpenseService as any, operationService);

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          rejecterId: 'member-1',
          reason: 'Too expensive',
          verifiedMembership: {
            userId: 'member-1',
            workspaceId: 'ws-1',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);

      expect(mockExpenseService.rejectExpense).not.toHaveBeenCalled();
    });

    it('rejects write operations when verified membership does not match actorId', async () => {
      const mockExpenseService = {
        deleteExpense: vi.fn(),
      };
      const handler = new DeleteExpenseHandler(mockExpenseService as any, operationService);

      await expect(
        handler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'attacker-1',
          verifiedMembership: {
            userId: 'victim-1',
            workspaceId: 'ws-1',
            role: 'ADMIN',
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);

      expect(mockExpenseService.deleteExpense).not.toHaveBeenCalled();
    });

    it('delegates to remote auth adapter when verified membership is absent', async () => {
      mockAuthPort.authorize.mockResolvedValueOnce({
        userId: 'finance-1',
        workspaceId: 'ws-1',
        role: 'MANAGER',
      });

      const mockExpenseService = {
        markExpenseAsReimbursed: vi.fn().mockResolvedValue({ ...dummyExpenseDTO, status: ExpenseStatus.REIMBURSED }),
      };
      const handler = new ReimburseExpenseHandler(mockExpenseService as any, operationService);

      const result = await handler.handle({
        expenseId: dummyUUID,
        workspaceId: 'ws-1',
        processedBy: 'finance-1',
        authToken: 'Bearer valid-token',
      });

      expect(result.data?.status).toBe(ExpenseStatus.REIMBURSED);
      expect(mockAuthPort.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'finance-1',
          workspaceId: 'ws-1',
          requiredRole: 'ADMIN',
          authToken: 'Bearer valid-token',
        })
      );
    });

    it('enforces mandatory OperationService and dependencies in constructors for all 7 write handlers', () => {
      const mockService = {} as any;
      const mockRepo = {} as any;

      expect(() => new CreateExpenseHandler(null as any, mockRepo, undefined, operationService)).toThrow(
        'ExpenseService is required for CreateExpenseHandler'
      );
      expect(() => new CreateExpenseHandler(mockService, null as any, undefined, operationService)).toThrow(
        'CategoryRepository is required for CreateExpenseHandler'
      );
      expect(() => new CreateExpenseHandler(mockService, mockRepo, undefined, null as any)).toThrow(
        'OperationService is required for CreateExpenseHandler'
      );

      expect(() => new UpdateExpenseHandler(null as any, mockRepo, operationService)).toThrow(
        'ExpenseService is required for UpdateExpenseHandler'
      );
      expect(() => new UpdateExpenseHandler(mockService, null as any, operationService)).toThrow(
        'CategoryRepository is required for UpdateExpenseHandler'
      );
      expect(() => new UpdateExpenseHandler(mockService, mockRepo, null as any)).toThrow(
        'OperationService is required for UpdateExpenseHandler'
      );

      expect(() => new DeleteExpenseHandler(null as any, operationService)).toThrow(
        'ExpenseService is required for DeleteExpenseHandler'
      );
      expect(() => new DeleteExpenseHandler(mockService, null as any)).toThrow(
        'OperationService is required for DeleteExpenseHandler'
      );

      expect(() => new SubmitExpenseHandler(null as any, operationService)).toThrow(
        'ExpenseService is required for SubmitExpenseHandler'
      );
      expect(() => new SubmitExpenseHandler(mockService, null as any)).toThrow(
        'OperationService is required for SubmitExpenseHandler'
      );

      expect(() => new ApproveExpenseHandler(null as any, operationService)).toThrow(
        'ExpenseService is required for ApproveExpenseHandler'
      );
      expect(() => new ApproveExpenseHandler(mockService, null as any)).toThrow(
        'OperationService is required for ApproveExpenseHandler'
      );

      expect(() => new RejectExpenseHandler(null as any, operationService)).toThrow(
        'ExpenseService is required for RejectExpenseHandler'
      );
      expect(() => new RejectExpenseHandler(mockService, null as any)).toThrow(
        'OperationService is required for RejectExpenseHandler'
      );

      expect(() => new ReimburseExpenseHandler(null as any, operationService)).toThrow(
        'ExpenseService is required for ReimburseExpenseHandler'
      );
      expect(() => new ReimburseExpenseHandler(mockService, null as any)).toThrow(
        'OperationService is required for ReimburseExpenseHandler'
      );
    });

    it('enforces authorization check on SubmitExpenseHandler, CreateExpenseHandler, and UpdateExpenseHandler', async () => {
      const mockExpenseService = {
        submitExpense: vi.fn(),
        createExpense: vi.fn(),
        updateExpense: vi.fn(),
      };
      const mockCatRepo = { exists: vi.fn().mockResolvedValue(true) };

      const submitHandler = new SubmitExpenseHandler(mockExpenseService as any, operationService);
      const createHandler = new CreateExpenseHandler(mockExpenseService as any, mockCatRepo as any, undefined, operationService);
      const updateHandler = new UpdateExpenseHandler(mockExpenseService as any, mockCatRepo as any, operationService);

      // Mismatched verified membership actorId
      await expect(
        submitHandler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-actual',
          verifiedMembership: {
            userId: 'user-spoofed',
            workspaceId: 'ws-1',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);

      await expect(
        createHandler.handle({
          workspaceId: 'ws-1',
          userId: 'user-actual',
          title: 'Test',
          amount: 100,
          currency: 'USD',
          expenseDate: new Date(),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          isReimbursable: false,
          verifiedMembership: {
            userId: 'user-spoofed',
            workspaceId: 'ws-1',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);

      await expect(
        updateHandler.handle({
          expenseId: dummyUUID,
          workspaceId: 'ws-1',
          userId: 'user-actual',
          verifiedMembership: {
            userId: 'user-spoofed',
            workspaceId: 'ws-1',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);

      expect(mockExpenseService.submitExpense).not.toHaveBeenCalled();
      expect(mockExpenseService.createExpense).not.toHaveBeenCalled();
      expect(mockExpenseService.updateExpense).not.toHaveBeenCalled();
    });
  });
});
