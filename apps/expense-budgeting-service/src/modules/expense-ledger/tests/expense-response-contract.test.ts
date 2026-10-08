import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Expense } from '../domain/entities/expense.entity';
import { PaymentMethod } from '../domain/enums/payment-method';
import { Money } from '../domain/value-objects/money';
import { ExpenseDate } from '../domain/value-objects/expense-date';
import { AttachmentId } from '../domain/value-objects/attachment-id';
import { expenseEnvelopeJsonSchema } from '../infrastructure/http/validation/expense.schema';

describe('Expense serialized HTTP facts for Approval', () => {
  it('preserves owner, attachments and version from the actual entity DTO', async () => {
    const app = Fastify();
    const expense = Expense.create({ workspaceId: randomUUID(), userId: randomUUID(),
      title: 'Response contract', amount: Money.create(10, 'USD'), expenseDate: ExpenseDate.today(),
      attachmentIds: [AttachmentId.create()],
      paymentMethod: PaymentMethod.CASH, isReimbursable: true });
    const dto = Expense.toDTO(expense);
    app.get('/expense', { schema: { response: { 200: expenseEnvelopeJsonSchema } } }, async () => ({
      success: true, statusCode: 200, message: 'Expense', data: dto,
    }));
    try {
      const response = await app.inject('/expense');
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ userId: dto.userId, attachmentIds: dto.attachmentIds, version: dto.version });
    } finally { await app.close(); }
  });
});
