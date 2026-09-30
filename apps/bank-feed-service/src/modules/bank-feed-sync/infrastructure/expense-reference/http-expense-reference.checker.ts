import { BankFeedSyncDomainError } from '../../domain/errors/bank-feed-sync.errors';
import { IExpenseReferenceChecker } from '../../application/services/transaction-sync.service';

export class HttpExpenseReferenceChecker implements IExpenseReferenceChecker {
  constructor(
    private readonly baseUrl = process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003',
    private readonly request: typeof fetch = fetch
  ) {}

  async exists(input: {
    workspaceId: string;
    expenseId: string;
    actorId: string;
    authorization: string;
  }): Promise<boolean> {
    const url = new URL(
      `/api/v1/workspaces/${encodeURIComponent(input.workspaceId)}/expenses/${encodeURIComponent(input.expenseId)}`,
      this.baseUrl
    );
    let response: Response;
    try {
      response = await this.request(url, {
        headers: {
          authorization: input.authorization,
          'x-user-id': input.actorId,
          'x-workspace-id': input.workspaceId,
          ...(process.env.INTERNAL_API_KEY ? { 'x-internal-api-key': process.env.INTERNAL_API_KEY } : {}),
        },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new BankFeedSyncDomainError('Expense service is unavailable', 'EXPENSE_SERVICE_UNAVAILABLE', 503);
    }
    if (response.status === 404) return false;
    if (response.status === 401 || response.status === 403) {
      throw new BankFeedSyncDomainError('Expense access denied', 'EXPENSE_ACCESS_DENIED', 403);
    }
    if (!response.ok) {
      throw new BankFeedSyncDomainError('Expense service is unavailable', 'EXPENSE_SERVICE_UNAVAILABLE', 503);
    }
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'success' in body && body.success === true &&
          'data' in body && typeof body.data === 'object' && body.data !== null &&
          'expenseId' in body.data && body.data.expenseId === input.expenseId &&
          'workspaceId' in body.data && body.data.workspaceId === input.workspaceId) {
        return true;
      }
    } catch {
      // Invalid upstream responses must never authorize an expense association.
    }
    throw new BankFeedSyncDomainError('Invalid expense service response', 'EXPENSE_SERVICE_INVALID_RESPONSE', 502);
  }
}
