import { z } from 'zod';
import { UserId } from '@core/domain/value-objects';
import { ICategorizationReferencePort } from '../../application/ports/categorization-reference.port';
import { SuggestionAcceptanceError } from '../../application/ports/suggestion-acceptance.port';

export class HttpCategorizationReferenceAdapter implements ICategorizationReferencePort {
  private async read(input: { workspaceId: string; userId: string }, resource: string): Promise<unknown> {
    const key = process.env.INTERNAL_API_KEY;
    if (!key) throw new SuggestionAcceptanceError('Expense service authentication is not configured', 503);
    const base = (process.env.EXPENSE_SERVICE_URL ?? 'http://localhost:3003').replace(/\/$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}/api/v1/workspaces/${input.workspaceId}/${resource}`, {
        redirect: 'error',
        headers: { 'x-internal-api-key': key, 'x-user-id': input.userId, 'x-workspace-id': input.workspaceId },
        signal: AbortSignal.timeout(5000),
      });
    } catch { throw new SuggestionAcceptanceError('Expense service is unavailable', 503); }
    if (response.status === 403 || response.status === 404) throw new SuggestionAcceptanceError('Resource is unavailable in this workspace', response.status);
    if (!response.ok) throw new SuggestionAcceptanceError('Expense service is unavailable', 503);
    try { return await response.json(); }
    catch { throw new SuggestionAcceptanceError('Expense service returned invalid data', 503); }
  }

  async readExpense(input: { workspaceId: string; expenseId: string; userId: string }) {
    const result = z.object({ data: z.object({ expenseId: z.string().uuid(), workspaceId: z.string().uuid(),
      userId: z.string().uuid().refine(UserId.isValid).transform(value => value.toLowerCase()),
      amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/).transform(Number).refine(Number.isFinite),
      merchant: z.string().optional(), description: z.string().optional(), paymentMethod: z.string(),
    }) }).safeParse(await this.read(input, `expenses/${input.expenseId}`));
    if (!result.success) throw new SuggestionAcceptanceError('Expense service returned invalid data', 503);
    const expense = result.data.data;
    if (expense.workspaceId.toLowerCase() !== input.workspaceId.toLowerCase() || expense.expenseId.toLowerCase() !== input.expenseId.toLowerCase()) {
      throw new SuggestionAcceptanceError('Expense does not belong to this workspace', 404);
    }
    return { expenseOwnerId: expense.userId, expenseData: { amount: expense.amount, merchant: expense.merchant, description: expense.description, paymentMethod: expense.paymentMethod } };
  }

  async ensureCategory(input: { workspaceId: string; categoryId: string; userId: string }): Promise<void> {
    const result = z.object({ data: z.object({ categoryId: z.string().uuid(), workspaceId: z.string().uuid(), isActive: z.boolean() }) })
      .safeParse(await this.read(input, `categories/${input.categoryId}`));
    if (!result.success) throw new SuggestionAcceptanceError('Expense service returned invalid data', 503);
    const category = result.data.data;
    if (category.workspaceId.toLowerCase() !== input.workspaceId.toLowerCase() || category.categoryId.toLowerCase() !== input.categoryId.toLowerCase()) {
      throw new SuggestionAcceptanceError('Category does not belong to this workspace', 404);
    }
    if (!category.isActive) throw new SuggestionAcceptanceError('Category is inactive', 409);
  }
}
