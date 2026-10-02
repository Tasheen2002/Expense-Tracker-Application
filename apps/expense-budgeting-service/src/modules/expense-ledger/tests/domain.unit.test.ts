import { describe, it, expect } from 'vitest';
import { Money } from '../domain/value-objects/money';
import { ExpenseDate } from '../domain/value-objects/expense-date';
import { AttachmentId } from '../domain/value-objects/attachment-id';
import { CategoryId } from '../domain/value-objects/category-id';
import { TagId } from '../domain/value-objects/tag-id';
import { ExpenseId } from '../domain/value-objects/expense-id';
import { SplitId } from '../domain/value-objects/split-id';
import {
  isValidRecurrenceFrequency,
  RecurrenceFrequency,
} from '../domain/enums/recurrence-frequency';
import {
  isValidRecurrenceStatus,
} from '../domain/enums/recurrence-status';
import {
  isValidSettlementStatus,
  SettlementStatus,
} from '../domain/enums/settlement-status';
import {
  isValidSplitType,
  SplitType,
} from '../domain/enums/split-type';
import { Expense, CreateExpenseProps, ExpenseDeletedEvent } from '../domain/entities/expense.entity';
import { Category, CategoryDeletedEvent } from '../domain/entities/category.entity';
import { Tag, TagDeletedEvent } from '../domain/entities/tag.entity';
import { Attachment } from '../domain/entities/attachment.entity';
import { ExpenseSplit, ExpenseSplitDeletedEvent } from '../domain/entities/expense-split.entity';
import { SplitSettlement } from '../domain/entities/split-settlement.entity';
import { RecurringExpense } from '../domain/entities/recurring-expense.entity';
import { PaymentMethod } from '../domain/enums/payment-method';
import { ExpenseStatus } from '../domain/enums/expense-status';
import {
  ExpenseTitleRequiredError,
  ExpenseTitleTooLongError,
  CategoryNameRequiredError,
  CategoryNameTooLongError,
  InvalidHexColorError,
  TagNameRequiredError,
  TagNameTooLongError,
  FileSizeLimitExceededError,
  InvalidFileTypeError,
  InvalidExpenseDateError,
  InvalidRecurrencePatternError,
} from '../domain/errors/expense.errors';
import {
  InvalidSplitAmountError,
  InvalidSplitPercentageError,
  InvalidSettlementAmountError,
} from '../domain/errors/split-expense.errors';
import {
  CurrencyMismatchError,
  ValueOutOfRangeError,
} from '../../../shared/domain/errors/domain-validation.errors';

describe('Expense Ledger Domain Layer Tests', () => {
  describe('Money Value Object', () => {
    it('creates valid Money and performs accurate arithmetic with Decimal', () => {
      const m1 = Money.create(100.50, 'USD');
      const m2 = Money.create(50.25, 'USD');

      const sum = m1.add(m2);
      expect(sum.toNumber()).toBe(150.75);
      expect(sum.getCurrency()).toBe('USD');

      const diff = m1.subtract(m2);
      expect(diff.toNumber()).toBe(50.25);

      const multiplied = m1.multiply(2);
      expect(multiplied.toNumber()).toBe(201.00);

      const divided = m1.divide(2);
      expect(divided.toNumber()).toBe(50.25);
    });

    it('rejects negative amount and currency mismatch', () => {
      expect(() => Money.create(-10, 'USD')).toThrow(ValueOutOfRangeError);

      const usd = Money.create(100, 'USD');
      const eur = Money.create(100, 'EUR');
      expect(() => usd.add(eur)).toThrow(CurrencyMismatchError);
    });

    it('rejects NaN, Infinity, and non-finite values in Money.create', () => {
      expect(() => Money.create(NaN, 'USD')).toThrow(ValueOutOfRangeError);
      expect(() => Money.create(Infinity, 'USD')).toThrow(ValueOutOfRangeError);
      expect(() => Money.create(-Infinity, 'USD')).toThrow(ValueOutOfRangeError);
    });

    it('rejects unsafe arithmetic in multiply and divide', () => {
      const money = Money.create(10, 'USD');
      expect(() => money.multiply(-1)).toThrow(ValueOutOfRangeError);
      expect(() => money.multiply(NaN)).toThrow(ValueOutOfRangeError);
      expect(() => money.multiply(Infinity)).toThrow(ValueOutOfRangeError);
      expect(() => money.divide(0)).toThrow(ValueOutOfRangeError);
      expect(() => money.divide(-2)).toThrow(ValueOutOfRangeError);
      expect(() => money.divide(NaN)).toThrow(ValueOutOfRangeError);
    });
  });

  describe('ExpenseDate Value Object', () => {
    it('allows valid dates and tolerates clock skew within 5 minutes', () => {
      const now = new Date();
      const ed = ExpenseDate.create(now);
      expect(ed.getValue().getTime()).toBe(now.getTime());

      // 2 minutes in future (clock skew)
      const slightlyFuture = new Date(Date.now() + 2 * 60 * 1000);
      expect(() => ExpenseDate.create(slightlyFuture)).not.toThrow();

      // 10 minutes in future -> should fail
      const farFuture = new Date(Date.now() + 10 * 60 * 1000);
      expect(() => ExpenseDate.create(farFuture)).toThrow(InvalidExpenseDateError);
    });

    it('rejects dates older than 10 years in create() but allows via fromPersistence()', () => {
      const elevenYearsAgo = new Date();
      elevenYearsAgo.setFullYear(elevenYearsAgo.getFullYear() - 11);

      expect(() => ExpenseDate.create(elevenYearsAgo)).toThrow(InvalidExpenseDateError);

      const persisted = ExpenseDate.fromPersistence(elevenYearsAgo);
      expect(persisted.getValue().getFullYear()).toBe(elevenYearsAgo.getFullYear());
    });

    it('enforces immutability by cloning input and output Date references', () => {
      const inputDate = new Date('2024-06-15T12:00:00Z');
      const ed = ExpenseDate.create(inputDate);

      // Mutating input Date should not affect ExpenseDate
      inputDate.setFullYear(2020);
      expect(ed.getValue().getFullYear()).toBe(2024);

      // Mutating returned Date should not affect ExpenseDate internal state
      const retrieved = ed.getValue();
      retrieved.setFullYear(2015);
      expect(ed.getValue().getFullYear()).toBe(2024);
    });
  });

  describe('Enum Type Guards', () => {
    it('validates recurrence frequency correctly', () => {
      expect(isValidRecurrenceFrequency('MONTHLY')).toBe(true);
      expect(isValidRecurrenceFrequency('HOURLY')).toBe(false);
    });

    it('validates recurrence status correctly', () => {
      expect(isValidRecurrenceStatus('ACTIVE')).toBe(true);
      expect(isValidRecurrenceStatus('ARCHIVED')).toBe(false);
    });

    it('validates settlement status correctly', () => {
      expect(isValidSettlementStatus('SETTLED')).toBe(true);
      expect(isValidSettlementStatus('UNKNOWN')).toBe(false);
    });

    it('validates split type correctly', () => {
      expect(isValidSplitType('PERCENTAGE')).toBe(true);
      expect(isValidSplitType('WEIGHTED')).toBe(false);
    });
  });

  describe('Expense Entity Invariants', () => {
    const validProps: CreateExpenseProps = {
      workspaceId: 'workspace-123',
      userId: 'user-123',
      title: 'Valid Expense',
      amount: Money.create(100, 'USD'),
      expenseDate: ExpenseDate.today(),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: true,
      tagIds: [],
      attachmentIds: [],
    };

    it('creates an Expense and emits ExpenseCreatedEvent with domain event constants', () => {
      const expense = Expense.create(validProps);
      expect(expense.id).toBeInstanceOf(ExpenseId);
      expect(expense.status).toBe(ExpenseStatus.DRAFT);

      const events = expense.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('expense.created');
    });

    it('forces initial status to DRAFT on creation', () => {
      const expense = Expense.create(validProps);
      expect(expense.status).toBe(ExpenseStatus.DRAFT);
    });

    it('validates title length constraints according to constants', () => {
      expect(() =>
        Expense.create({ ...validProps, title: '' })
      ).toThrow(ExpenseTitleRequiredError);

      const longTitle = 'a'.repeat(256);
      expect(() =>
        Expense.create({ ...validProps, title: longTitle })
      ).toThrow(ExpenseTitleTooLongError);
    });

    it('emits ExpenseDeletedEvent with workspaceId upon deletion', () => {
      const expense = Expense.create(validProps);
      expense.markAsDeleted();
      const deleteEvent = expense.domainEvents.find(
        (e) => e instanceof ExpenseDeletedEvent
      ) as ExpenseDeletedEvent;
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent.workspaceId).toBe('workspace-123');
      expect(deleteEvent.getPayload().workspaceId).toBe('workspace-123');
    });

    it('enforces MIN_EXPENSE_AMOUNT and MAX_EXPENSE_AMOUNT on create and updateAmount', () => {
      // 0 is < MIN_EXPENSE_AMOUNT (0.01)
      expect(() =>
        Expense.create({ ...validProps, amount: Money.create(0, 'USD') })
      ).toThrow(ValueOutOfRangeError);

      // Above MAX_EXPENSE_AMOUNT (999,999,999.99)
      expect(() =>
        Expense.create({ ...validProps, amount: Money.create(1_000_000_000, 'USD') })
      ).toThrow(ValueOutOfRangeError);

      // updateAmount rejects 0 and excessive amount
      const expense = Expense.create(validProps);
      expect(() => expense.updateAmount(Money.create(0, 'USD'))).toThrow(ValueOutOfRangeError);
      expect(() => expense.updateAmount(Money.create(1_000_000_000, 'USD'))).toThrow(ValueOutOfRangeError);

      // Valid update
      expense.updateAmount(Money.create(250.50, 'USD'));
      expect(expense.amount.toNumber()).toBe(250.50);

      // Defensive copy for dates
      const created = expense.createdAt;
      created.setFullYear(1999);
      expect(expense.createdAt.getFullYear()).not.toBe(1999);
    });
  });

  describe('Category Entity Invariants', () => {
    it('enforces name and hex color validation', () => {
      expect(() =>
        Category.create({
          workspaceId: 'workspace-123',
          name: '',
          isActive: true,
        })
      ).toThrow(CategoryNameRequiredError);

      expect(() =>
        Category.create({
          workspaceId: 'workspace-123',
          name: 'a'.repeat(101),
          isActive: true,
        })
      ).toThrow(CategoryNameTooLongError);

      expect(() =>
        Category.create({
          workspaceId: 'workspace-123',
          name: 'Travel',
          color: 'not-a-color',
          isActive: true,
        })
      ).toThrow(InvalidHexColorError);

      const validCategory = Category.create({
        workspaceId: 'workspace-123',
        name: 'Travel',
        color: '#ff5733',
        isActive: true,
      });
      expect(validCategory.id).toBeInstanceOf(CategoryId);
    });

    it('emits CategoryDeletedEvent with workspaceId upon deletion', () => {
      const category = Category.create({
        workspaceId: 'workspace-123',
        name: 'Office',
        isActive: true,
      });
      category.markAsDeleted();
      const deleteEvent = category.domainEvents.find(
        (e) => e instanceof CategoryDeletedEvent
      ) as CategoryDeletedEvent;
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent.workspaceId).toBe('workspace-123');
      expect(deleteEvent.getPayload().workspaceId).toBe('workspace-123');
    });
  });

  describe('Tag Entity Invariants', () => {
    it('enforces name and hex color validation', () => {
      expect(() =>
        Tag.create({
          workspaceId: 'workspace-123',
          name: '',
        })
      ).toThrow(TagNameRequiredError);

      expect(() =>
        Tag.create({
          workspaceId: 'workspace-123',
          name: 'a'.repeat(51),
        })
      ).toThrow(TagNameTooLongError);

      const validTag = Tag.create({
        workspaceId: 'workspace-123',
        name: 'Q3-Trip',
        color: '#00AAFF',
      });
      expect(validTag.id).toBeInstanceOf(TagId);
    });

    it('emits TagDeletedEvent with workspaceId upon deletion', () => {
      const tag = Tag.create({
        workspaceId: 'workspace-123',
        name: 'urgent',
      });
      tag.markAsDeleted();
      const deleteEvent = tag.domainEvents.find(
        (e) => e instanceof TagDeletedEvent
      ) as TagDeletedEvent;
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent.workspaceId).toBe('workspace-123');
      expect(deleteEvent.getPayload().workspaceId).toBe('workspace-123');
    });
  });

  describe('Attachment Entity Invariants', () => {
    it('enforces size and allowed MIME types and implements equals()', () => {
      expect(() =>
        Attachment.create({
          expenseId: 'expense-123',
          fileName: 'receipt.png',
          filePath: '/uploads/receipt.png',
          fileSize: 11 * 1024 * 1024, // 11MB exceeds 10MB limit
          mimeType: 'image/png',
          uploadedBy: 'user-123',
        })
      ).toThrow(FileSizeLimitExceededError);

      expect(() =>
        Attachment.create({
          expenseId: 'expense-123',
          fileName: 'receipt.exe',
          filePath: '/uploads/receipt.exe',
          fileSize: 1024,
          mimeType: 'application/x-msdownload',
          uploadedBy: 'user-123',
        })
      ).toThrow(InvalidFileTypeError);

      const a1 = Attachment.create({
        expenseId: 'expense-123',
        fileName: 'receipt.png',
        filePath: '/uploads/receipt.png',
        fileSize: 1024,
        mimeType: 'image/png',
        uploadedBy: 'user-123',
      });

      const a2 = Attachment.fromPersistence({
        id: a1.id,
        expenseId: a1.expenseId,
        fileName: a1.fileName,
        filePath: a1.filePath,
        fileSize: a1.fileSize,
        mimeType: a1.mimeType,
        uploadedBy: a1.uploadedBy,
        createdAt: a1.createdAt,
      });

      expect(a1.equals(a2)).toBe(true);
      expect(a1.id).toBeInstanceOf(AttachmentId);
    });
  });

  describe('ExpenseSplit Entity Invariants & Deterministic Allocation', () => {
    it('deterministically allocates indivisible equal splits with minor-unit remainder distribution', () => {
      // 10.00 / 3 -> [3.34, 3.33, 3.33]
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(10.00, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }],
      });

      const participants = split.participants;
      expect(participants).toHaveLength(3);
      expect(participants[0].shareAmount.toNumber()).toBe(3.34);
      expect(participants[1].shareAmount.toNumber()).toBe(3.33);
      expect(participants[2].shareAmount.toNumber()).toBe(3.33);

      // Verify exact sum equals total
      const totalAllocated = participants.reduce(
        (sum, p) => sum + p.shareAmount.toNumber(),
        0
      );
      expect(Math.round(totalAllocated * 100) / 100).toBe(10.00);
    });

    it('deterministically allocates small cents remainder', () => {
      // 0.05 / 3 -> [0.02, 0.02, 0.01]
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(0.05, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }],
      });

      const participants = split.participants;
      expect(participants[0].shareAmount.toNumber()).toBe(0.02);
      expect(participants[1].shareAmount.toNumber()).toBe(0.02);
      expect(participants[2].shareAmount.toNumber()).toBe(0.01);
      const total = participants.reduce((s, p) => s + p.shareAmount.toNumber(), 0);
      expect(Math.round(total * 100) / 100).toBe(0.05);
    });

    it('allocates percentage-based split with remainder distribution', () => {
      // 100.00 split 33.33%, 33.33%, 33.34% -> 33.33, 33.33, 33.34
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(100.00, 'USD'),
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: 'user-1', sharePercentage: 33.33 },
          { userId: 'user-2', sharePercentage: 33.33 },
          { userId: 'user-3', sharePercentage: 33.34 },
        ],
      });

      const sum = split.participants.reduce((s, p) => s + p.shareAmount.toNumber(), 0);
      expect(Math.round(sum * 100) / 100).toBe(100.00);
    });

    it('rejects percentage splits that do not sum to 100%', () => {
      expect(() =>
        ExpenseSplit.create({
          expenseId: ExpenseId.create(),
          workspaceId: 'workspace-123',
          paidBy: 'user-1',
          totalAmount: Money.create(100, 'USD'),
          splitType: SplitType.PERCENTAGE,
          participants: [
            { userId: 'user-1', sharePercentage: 50 },
            { userId: 'user-2', sharePercentage: 40 },
          ],
        })
      ).toThrow(InvalidSplitPercentageError);
    });

    it('rejects duplicate participant user IDs', () => {
      expect(() =>
        ExpenseSplit.create({
          expenseId: ExpenseId.create(),
          workspaceId: 'workspace-123',
          paidBy: 'user-1',
          totalAmount: Money.create(50, 'USD'),
          splitType: SplitType.EQUAL,
          participants: [{ userId: 'user-1' }, { userId: 'user-1' }],
        })
      ).toThrow(InvalidSplitAmountError);
    });

    it('protects participant collection encapsulation via readonly defensive copy', () => {
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(10, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });

      const returnedParticipants = split.participants as Array<unknown>;
      returnedParticipants.push({ fake: true });
      expect(split.participants).toHaveLength(2);
    });

    it('ensures equal split percentages always sum to exactly 100.00% via basis points distribution', () => {
      // 3 participants: 33.34 + 33.33 + 33.33 = 100.00%
      const split3 = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(100, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }],
      });
      const sumPercentages3 = split3.participants.reduce((acc, p) => acc + (p.sharePercentage ?? 0), 0);
      expect(Math.round(sumPercentages3 * 100) / 100).toBe(100.00);
      expect(split3.participants[0].sharePercentage).toBe(33.34);
      expect(split3.participants[1].sharePercentage).toBe(33.33);
      expect(split3.participants[2].sharePercentage).toBe(33.33);

      // 6 participants: 4 * 16.67 + 2 * 16.66 = 100.00%
      const split6 = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(60, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' },
          { userId: 'u4' }, { userId: 'u5' }, { userId: 'u6' }
        ],
      });
      const sumPercentages6 = split6.participants.reduce((acc, p) => acc + (p.sharePercentage ?? 0), 0);
      expect(Math.round(sumPercentages6 * 100) / 100).toBe(100.00);
    });

    it('ensures exact split percentages always sum to exactly 100.00% via basis points distribution', () => {
      // 0.03 split into 0.01, 0.01, 0.01 -> 33.34%, 33.33%, 33.33% = 100.00%
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(0.03, 'USD'),
        splitType: SplitType.EXACT,
        participants: [
          { userId: 'user-1', shareAmount: Money.create(0.01, 'USD') },
          { userId: 'user-2', shareAmount: Money.create(0.01, 'USD') },
          { userId: 'user-3', shareAmount: Money.create(0.01, 'USD') },
        ],
      });

      const p = split.participants;
      expect(p[0].sharePercentage).toBe(33.34);
      expect(p[1].sharePercentage).toBe(33.33);
      expect(p[2].sharePercentage).toBe(33.33);
      const sum = p.reduce((acc, cur) => acc + (cur.sharePercentage ?? 0), 0);
      expect(Math.round(sum * 100) / 100).toBe(100.00);
    });

    it('rejects zero or negative totalAmount in ExpenseSplit.create', () => {
      expect(() =>
        ExpenseSplit.create({
          expenseId: ExpenseId.create(),
          workspaceId: 'workspace-123',
          paidBy: 'user-1',
          totalAmount: Money.create(0, 'USD'),
          splitType: SplitType.EQUAL,
          participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
        })
      ).toThrow(InvalidSplitAmountError);
    });

    it('allocates one-cent expense accurately without losing or creating money', () => {
      // 0.01 split across 3 participants -> [0.01, 0.00, 0.00]
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(0.01, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }],
      });
      const p = split.participants;
      expect(p[0].shareAmount.toNumber()).toBe(0.01);
      expect(p[1].shareAmount.toNumber()).toBe(0.00);
      expect(p[2].shareAmount.toNumber()).toBe(0.00);
      const sum = p.reduce((acc, cur) => acc + cur.shareAmount.toNumber(), 0);
      expect(Math.round(sum * 100) / 100).toBe(0.01);
    });

    it('guarantees participant objects inside split cannot be mutated from outside', () => {
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(10, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });

      const p1 = split.participants[0];
      // Mutating returned clone's state
      p1.markAsPaid();
      expect(p1.isPaid).toBe(true);
      // Internal participant in split remains unpaid
      expect(split.participants[0].isPaid).toBe(false);

      // Mutating getParticipantByUserId clone
      const p2 = split.getParticipantByUserId('user-2');
      p2?.markAsPaid();
      expect(split.getParticipantByUserId('user-2')?.isPaid).toBe(false);

      // Mutating through aggregate method correctly updates internal aggregate
      split.markParticipantAsPaid('user-2');
      expect(split.getParticipantByUserId('user-2')?.isPaid).toBe(true);
      expect(split.participants[1].isPaid).toBe(true);
    });

    it('emits ExpenseSplitDeletedEvent with workspaceId upon deletion', () => {
      const split = ExpenseSplit.create({
        expenseId: ExpenseId.create(),
        workspaceId: 'workspace-123',
        paidBy: 'user-1',
        totalAmount: Money.create(10, 'USD'),
        splitType: SplitType.EQUAL,
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });

      split.markAsDeleted();
      const deleteEvent = split.domainEvents.find(
        (e) => e instanceof ExpenseSplitDeletedEvent
      ) as ExpenseSplitDeletedEvent;
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent.workspaceId).toBe('workspace-123');
      expect(deleteEvent.getPayload().workspaceId).toBe('workspace-123');
    });
  });

  describe('SplitSettlement Financial Invariants', () => {
    it('rejects zero or negative owedAmount in SplitSettlement.create', () => {
      expect(() =>
        SplitSettlement.create({
          splitId: SplitId.create(),
          fromUserId: 'user-2',
          toUserId: 'user-1',
          owedAmount: Money.create(0, 'USD'),
        })
      ).toThrow(InvalidSettlementAmountError);
    });

    it('rejects currency mismatch on payment', () => {
      const settlement = SplitSettlement.create({
        splitId: SplitId.create(),
        fromUserId: 'user-2',
        toUserId: 'user-1',
        owedAmount: Money.create(50, 'USD'),
      });

      expect(() =>
        settlement.recordPayment(Money.create(25, 'EUR'))
      ).toThrow(InvalidSettlementAmountError);
    });

    it('rejects zero or negative payment amounts', () => {
      const settlement = SplitSettlement.create({
        splitId: SplitId.create(),
        fromUserId: 'user-2',
        toUserId: 'user-1',
        owedAmount: Money.create(50, 'USD'),
      });

      expect(() =>
        settlement.recordPayment(Money.create(0, 'USD'))
      ).toThrow(InvalidSettlementAmountError);
    });

    it('rejects payments exceeding owed amount', () => {
      const settlement = SplitSettlement.create({
        splitId: SplitId.create(),
        fromUserId: 'user-2',
        toUserId: 'user-1',
        owedAmount: Money.create(50, 'USD'),
      });

      expect(() =>
        settlement.recordPayment(Money.create(50.01, 'USD'))
      ).toThrow(InvalidSettlementAmountError);
    });

    it('records partial and full payments and updates status accurately', () => {
      const settlement = SplitSettlement.create({
        splitId: SplitId.create(),
        fromUserId: 'user-2',
        toUserId: 'user-1',
        owedAmount: Money.create(50, 'USD'),
      });

      settlement.recordPayment(Money.create(20, 'USD'));
      expect(settlement.status).toBe(SettlementStatus.PARTIAL);
      expect(settlement.getRemainingAmount().toNumber()).toBe(30);

      settlement.recordPayment(Money.create(30, 'USD'));
      expect(settlement.status).toBe(SettlementStatus.SETTLED);
      expect(settlement.getRemainingAmount().toNumber()).toBe(0);
      expect(settlement.settledAt).toBeDefined();
    });
  });

  describe('RecurringExpense Invariants & Scheduling', () => {
    const validTemplate = {
      title: 'Cloud Subscription',
      amount: 49.99,
      currency: 'USD',
    };

    it('rejects invalid or non-integer intervals', () => {
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 0,
          startDate: new Date(),
          template: validTemplate,
        })
      ).toThrow(InvalidRecurrencePatternError);

      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: -2,
          startDate: new Date(),
          template: validTemplate,
        })
      ).toThrow(InvalidRecurrencePatternError);

      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1.5,
          startDate: new Date(),
          template: validTemplate,
        })
      ).toThrow(InvalidRecurrencePatternError);
    });

    it('rejects end dates on or before start date and exceeding 10 years', () => {
      const start = new Date('2025-01-01');
      const earlierEnd = new Date('2024-12-31');
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: start,
          endDate: earlierEnd,
          template: validTemplate,
        })
      ).toThrow(InvalidRecurrencePatternError);

      const farEnd = new Date('2036-01-02'); // > 10 years
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: start,
          endDate: farEnd,
          template: validTemplate,
        })
      ).toThrow(InvalidRecurrencePatternError);
    });

    it('rejects invalid start and end dates with NaN timestamps', () => {
      const invalidDate = new Date('invalid-date-string');
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: invalidDate,
          template: validTemplate,
        })
      ).toThrow(InvalidRecurrencePatternError);

      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          endDate: invalidDate,
          template: validTemplate,
        })
      ).toThrow(InvalidRecurrencePatternError);
    });

    it('rejects invalid template titles, amounts, and currencies', () => {
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, title: '' },
        })
      ).toThrow(InvalidRecurrencePatternError);

      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, amount: -10 },
        })
      ).toThrow(InvalidRecurrencePatternError);

      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, amount: NaN },
        })
      ).toThrow(InvalidRecurrencePatternError);

      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, currency: 'INVALID' },
        })
      ).toThrow(InvalidRecurrencePatternError);
    });

    it('clamps month-end dates accurately preventing date drift across months', () => {
      // Start on January 31, 2025
      const recurring = RecurringExpense.create({
        workspaceId: 'workspace-123',
        userId: 'user-1',
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-31T10:00:00Z'),
        template: validTemplate,
      });

      // After 1 run (January -> February), February 2025 has 28 days
      recurring.markAsRun();
      expect(recurring.nextRunDate.getMonth()).toBe(1); // February (0-indexed)
      expect(recurring.nextRunDate.getDate()).toBe(28);

      // Next run (February -> March), March has 31 days so original day 31 is preserved
      recurring.markAsRun();
      expect(recurring.nextRunDate.getMonth()).toBe(2); // March
      expect(recurring.nextRunDate.getDate()).toBe(31);
    });

    it('clamps leap-year February 29 to February 28 on non-leap year in yearly recurrence', () => {
      // Start on February 29, 2024 (leap year)
      const recurring = RecurringExpense.create({
        workspaceId: 'workspace-123',
        userId: 'user-1',
        frequency: RecurrenceFrequency.YEARLY,
        interval: 1,
        startDate: new Date('2024-02-29T10:00:00Z'),
        template: validTemplate,
      });

      recurring.markAsRun();
      expect(recurring.nextRunDate.getFullYear()).toBe(2025);
      expect(recurring.nextRunDate.getMonth()).toBe(1); // February
      expect(recurring.nextRunDate.getDate()).toBe(28); // Clamped to 28
    });

    it('validates template decimal places, amount bounds, payment methods, and text lengths', () => {
      // 3 decimal places rejected (e.g. 0.001)
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, amount: 0.001 },
        })
      ).toThrow(InvalidRecurrencePatternError);

      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, amount: 49.999 },
        })
      ).toThrow(InvalidRecurrencePatternError);

      // Amount exceeds MAX_EXPENSE_AMOUNT
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, amount: 1_000_000_000 },
        })
      ).toThrow(InvalidRecurrencePatternError);

      // Amount < MIN_EXPENSE_AMOUNT
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, amount: 0.005 },
        })
      ).toThrow(InvalidRecurrencePatternError);

      // Invalid payment method
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, paymentMethod: 'BITCOIN' },
        })
      ).toThrow(InvalidRecurrencePatternError);

      // Excessive description
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, description: 'a'.repeat(5001) },
        })
      ).toThrow(InvalidRecurrencePatternError);

      // Excessive merchant
      expect(() =>
        RecurringExpense.create({
          workspaceId: 'workspace-123',
          userId: 'user-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
          template: { ...validTemplate, merchant: 'a'.repeat(256) },
        })
      ).toThrow(InvalidRecurrencePatternError);
    });

    it('protects internal mutable state via defensive copying of dates and template', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const tmpl = {
        title: 'Software',
        amount: 25.00,
        currency: 'USD',
        tagIds: ['tag-1'],
      };

      const recurring = RecurringExpense.create({
        workspaceId: 'workspace-123',
        userId: 'user-1',
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: start,
        template: tmpl,
      });

      // Mutating input Date after creation does not affect aggregate
      start.setFullYear(2030);
      expect(recurring.startDate.getFullYear()).toBe(2025);

      // Mutating input template after creation does not affect aggregate
      tmpl.title = 'Hacked';
      tmpl.tagIds.push('tag-2');
      expect(recurring.template.title).toBe('Software');
      expect(recurring.template.tagIds).toEqual(['tag-1']);

      // Mutating returned Date from getter does not affect aggregate
      const returnedDate = recurring.nextRunDate;
      returnedDate.setFullYear(2099);
      expect(recurring.nextRunDate.getFullYear()).toBe(2025);

      // Mutating returned template from getter does not affect aggregate
      const returnedTemplate = recurring.template;
      returnedTemplate.title = 'Mutated';
      returnedTemplate.tagIds?.push('tag-fake');
      expect(recurring.template.title).toBe('Software');
      expect(recurring.template.tagIds).toEqual(['tag-1']);
    });
  });
});
