import { z } from 'zod';
import { ISuggestionAcceptancePort, SuggestionAcceptanceError } from '../../application/ports/suggestion-acceptance.port';

const expenseSchema = z.object({ data: z.object({
  expenseId: z.string().uuid(), workspaceId: z.string().uuid(),
  version: z.number().int().positive(), status: z.string(),
}) });
const categorySchema = z.object({ data: z.object({
  categoryId: z.string().uuid(), workspaceId: z.string().uuid(), isActive: z.boolean(),
}) });

export class HttpSuggestionAcceptanceAdapter implements ISuggestionAcceptancePort {
  constructor(private readonly options: { expenseServiceUrl?: string; internalApiKey?: string; timeoutMs?: number } = {}) {}

  async validate(input: { workspaceId: string; expenseId: string; categoryId: string; userId: string }): Promise<{ expenseVersion: number }> {
    const key = this.options.internalApiKey ?? process.env.INTERNAL_API_KEY;
    if (!key) throw new SuggestionAcceptanceError('Expense service authentication is not configured', 503);
    const base = (this.options.expenseServiceUrl ?? process.env.EXPENSE_SERVICE_URL ?? 'http://localhost:3003').replace(/\/$/, '');
    const read = async (path: string): Promise<unknown> => {
      let response: Response;
      try {
        response = await fetch(`${base}/api/v1/workspaces/${input.workspaceId}/${path}`, {
          redirect: 'error',
          headers: { 'x-internal-api-key': key, 'x-user-id': input.userId, 'x-workspace-id': input.workspaceId },
          signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
        });
      } catch { throw new SuggestionAcceptanceError('Expense service is unavailable', 503); }
      if (response.status === 403 || response.status === 404) {
        throw new SuggestionAcceptanceError('Expense or category is unavailable in this workspace', response.status);
      }
      if (!response.ok) throw new SuggestionAcceptanceError('Expense service is unavailable', 503);
      try { return await response.json(); }
      catch { throw new SuggestionAcceptanceError('Expense service returned an invalid response', 503); }
    };
    const [expenseResponse, categoryResponse] = await Promise.all([
      read(`expenses/${input.expenseId}`), read(`categories/${input.categoryId}`),
    ]);
    const expense = expenseSchema.safeParse(expenseResponse);
    const category = categorySchema.safeParse(categoryResponse);
    if (!expense.success || !category.success) throw new SuggestionAcceptanceError('Expense service returned an invalid response', 503);
    if (expense.data.data.workspaceId.toLowerCase() !== input.workspaceId.toLowerCase() ||
        category.data.data.workspaceId.toLowerCase() !== input.workspaceId.toLowerCase() ||
        expense.data.data.expenseId.toLowerCase() !== input.expenseId.toLowerCase() ||
        category.data.data.categoryId.toLowerCase() !== input.categoryId.toLowerCase()) {
      throw new SuggestionAcceptanceError('Expense or category does not belong to this workspace', 404);
    }
    if (!category.data.data.isActive) throw new SuggestionAcceptanceError('Category is inactive', 409);
    if (!['DRAFT', 'REJECTED'].includes(expense.data.data.status)) throw new SuggestionAcceptanceError('Expense cannot be edited in its current status', 409);
    return { expenseVersion: expense.data.data.version };
  }
}
