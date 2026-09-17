import { z } from 'zod';
import {
  IExpenseSnapshotService,
  ExpenseSnapshot,
  GetExpenseSnapshotInput,
} from '../../ports/expense-snapshot.port';
import { Currency } from '@core/domain/value-objects';

const ExpenseSnapshotEnvelopeSchema = z.object({
  data: z.record(z.unknown()),
});

export interface HttpExpenseSnapshotAdapterOptions {
  expenseServiceUrl?: string;
  timeoutMs?: number;
}

export class HttpExpenseSnapshotAdapter implements IExpenseSnapshotService {
  private readonly expenseServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(options?: HttpExpenseSnapshotAdapterOptions) {
    this.expenseServiceUrl =
      options?.expenseServiceUrl ||
      process.env.EXPENSE_SERVICE_URL ||
      'http://localhost:3003';
    this.timeoutMs = options?.timeoutMs || 5000;
  }

  async getExpenseSnapshot(input: GetExpenseSnapshotInput): Promise<ExpenseSnapshot> {
    const { workspaceId, expenseId, userId, authToken } = input;

    try {
      const url = `${this.expenseServiceUrl}/api/v1/workspaces/${workspaceId}/expenses/${expenseId}`;
      const headers: Record<string, string> = {
        'x-workspace-id': workspaceId,
      };

      if (userId) {
        headers['x-user-id'] = userId;
      }

      if (authToken) {
        headers.authorization = authToken.startsWith('Bearer ')
          ? authToken
          : `Bearer ${authToken}`;
      }

      const internalKey = process.env.INTERNAL_API_KEY;
      if (internalKey) {
        headers['x-internal-api-key'] = internalKey;
      }

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(
          `Expense ${expenseId} could not be retrieved from workspace ${workspaceId} (HTTP ${response.status})`
        );
      }

      let rawJson: unknown;
      try {
        rawJson = await response.json();
      } catch {
        throw new Error(
          `Expense ${expenseId} could not be retrieved: empty or invalid response body`
        );
      }

      const parseResult = ExpenseSnapshotEnvelopeSchema.safeParse(rawJson);
      if (!parseResult.success) {
        throw new Error(
          `Expense ${expenseId} could not be retrieved: empty or invalid response body`
        );
      }

      const expense = parseResult.data.data;

      const returnedWorkspaceId =
        typeof expense.workspaceId === 'string' ? expense.workspaceId : '';
      if (returnedWorkspaceId !== workspaceId) {
        throw new Error(
          `Expense ${expenseId} belongs to workspace ${returnedWorkspaceId || 'unknown'}, not ${workspaceId}`
        );
      }

      const returnedExpenseId =
        typeof expense.expenseId === 'string'
          ? expense.expenseId
          : typeof expense.id === 'string'
          ? expense.id
          : '';
      if (!returnedExpenseId || returnedExpenseId !== expenseId) {
        throw new Error(
          `Expense ID mismatch: requested ${expenseId}, returned ${returnedExpenseId}`
        );
      }

      if (typeof expense.userId !== 'string' || !expense.userId) {
        throw new Error(
          `Expense ${expenseId} has missing or invalid owner userId`
        );
      }
      const returnedUserId = expense.userId;

      if (typeof expense.status !== 'string' || !expense.status) {
        throw new Error(
          `Expense ${expenseId} has missing or invalid status`
        );
      }
      const returnedStatus = expense.status;

      // Fail-closed amount validation: malformed, zero, or negative amounts MUST reject
      const parsedAmount =
        typeof expense.amount === 'number'
          ? expense.amount
          : typeof expense.amount === 'string'
          ? parseFloat(expense.amount)
          : NaN;

      if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error(
          `Expense ${expenseId} has invalid or non-positive amount: ${expense.amount}`
        );
      }

      // ExpenseDTO in expense-budgeting-service returns `attachmentIds: string[]`.
      // Also check `attachments` and `receiptUrl` for compatibility.
      const hasReceipt = Boolean(
        (Array.isArray(expense.attachmentIds) && expense.attachmentIds.length > 0) ||
        (Array.isArray(expense.attachments) && expense.attachments.length > 0) ||
        Boolean(expense.receiptUrl)
      );

      if (typeof expense.currency !== 'string' || !expense.currency) {
        throw new Error(
          `Expense ${expenseId} has missing or invalid currency`
        );
      }
      const normalizedCurrency = expense.currency.trim().toUpperCase();
      if (!Currency.isValidCurrencyCode(normalizedCurrency)) {
        throw new Error(
          `Expense ${expenseId} has invalid currency code: ${expense.currency}`
        );
      }

      if (
        !expense.expenseDate ||
        (typeof expense.expenseDate !== 'string' &&
          typeof expense.expenseDate !== 'number' &&
          !(expense.expenseDate instanceof Date))
      ) {
        throw new Error(
          `Expense ${expenseId} has missing expenseDate`
        );
      }
      const parsedDate = new Date(expense.expenseDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(
          `Expense ${expenseId} has invalid expenseDate`
        );
      }

      return {
        expenseId: returnedExpenseId,
        workspaceId: returnedWorkspaceId,
        userId: returnedUserId,
        amount: parsedAmount,
        currency: normalizedCurrency,
        categoryId: typeof expense.categoryId === 'string' ? expense.categoryId : undefined,
        merchant: typeof expense.merchant === 'string' ? expense.merchant : undefined,
        description: typeof expense.description === 'string' ? expense.description : undefined,
        hasReceipt,
        expenseDate: parsedDate,
        status: returnedStatus,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to verify authoritative expense facts: ${msg}`);
    }
  }
}
