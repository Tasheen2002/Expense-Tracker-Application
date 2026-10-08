import { z } from 'zod';
import { IExpenseReferencePort } from '../../application/ports/expense-reference.port';

export class HttpExpenseReferenceAdapter implements IExpenseReferencePort {
  async assertInWorkspace(expenseId: string, workspaceId: string, actorId: string, authToken?: string): Promise<void> {
    z.string().uuid().parse(expenseId);
    const unavailable = () => Object.assign(new Error('Expense service is unavailable'), { statusCode: 503 });
    if (!process.env.INTERNAL_API_KEY) throw unavailable();
    const base = (process.env.EXPENSE_SERVICE_URL ?? 'http://localhost:3003').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}/api/v1/workspaces/${workspaceId}/expenses/${expenseId}`, {
        redirect: 'error', signal: AbortSignal.timeout(5000), headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY, 'x-user-id': actorId,
          ...(authToken ? { authorization: authToken } : {}),
        },
      });
    } catch { throw unavailable(); }
    if (response.status === 403 || response.status === 404) throw Object.assign(new Error('Expense is not accessible in this workspace'), { statusCode: 404 });
    if (!response.ok) throw unavailable();
    const schema = z.object({ data: z.object({ expenseId: z.string().uuid(), workspaceId: z.string().uuid() }) });
    let value: z.infer<typeof schema>;
    try { value = schema.parse(await response.json()); } catch { throw unavailable(); }
    if (value.data.expenseId.toLowerCase() !== expenseId.toLowerCase() || value.data.workspaceId.toLowerCase() !== workspaceId.toLowerCase()) {
      throw Object.assign(new Error('Expense is not accessible in this workspace'), { statusCode: 404 });
    }
  }
}
