import { describe, expect, it } from 'vitest';
import { Expense } from '../domain/entities/expense.entity';
import { AttachmentId } from '../domain/value-objects/attachment-id';
import { Money } from '../domain/value-objects/money';
import { ExpenseDate } from '../domain/value-objects/expense-date';
import { PaymentMethod } from '../domain/enums/payment-method';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';

describe('Expense attachment events', () => {
  it('emits a removal event once for an existing attachment', () => {
    const expense = Expense.create({
      workspaceId: '79797979-1111-4111-8111-111111111111',
      userId: '79797979-2222-4222-8222-222222222222',
      title: 'Receipt',
      amount: Money.create(10, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });
    const attachmentId = AttachmentId.create();
    expense.clearDomainEvents();
    expense.addAttachment(attachmentId);
    expense.clearDomainEvents();

    expense.removeAttachment(attachmentId);
    expense.removeAttachment(attachmentId);

    expect(expense.domainEvents).toHaveLength(1);
    expect(expense.domainEvents[0].eventType).toBe(EXPENSE_EVENTS.ATTACHMENT_REMOVED);
    expect(expense.domainEvents[0].getPayload()).toEqual({
      expenseId: expense.id.getValue(),
      workspaceId: expense.workspaceId,
      attachmentId: attachmentId.getValue(),
    });
  });
});
