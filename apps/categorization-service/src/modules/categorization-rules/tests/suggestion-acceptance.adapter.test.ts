import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpSuggestionAcceptanceAdapter } from '../infrastructure/adapters/http-suggestion-acceptance.adapter';
import { HttpCategorizationReferenceAdapter } from '../infrastructure/adapters/http-categorization-reference.adapter';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { HttpWorkspaceAccessAdapter } from '../infrastructure/adapters/http-workspace-access.adapter';
import { UserId, WorkspaceId } from '@core/domain/value-objects';

const input = { workspaceId: randomUUID(), expenseId: randomUUID(), categoryId: randomUUID(), userId: randomUUID() };
const expense = { expenseId: input.expenseId, workspaceId: input.workspaceId, version: 4, status: 'DRAFT' };
const category = { categoryId: input.categoryId, workspaceId: input.workspaceId, isActive: true };
const adapter = new HttpSuggestionAcceptanceAdapter({ internalApiKey: 'test-key', expenseServiceUrl: 'http://expense.test' });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function responses(expenseData = expense, categoryData = category) {
  return vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify({ data: url.includes('/expenses/') ? expenseData : categoryData }))));
}
describe('Suggestion acceptance owner-service checks', () => {
  it('checks scoped resources and forwards the verified actor and internal key', async () => {
    responses();
    await expect(adapter.validate(input)).resolves.toEqual({ expenseVersion: 4 });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/workspaces/${input.workspaceId}/expenses/${input.expenseId}`), expect.objectContaining({ headers: {
      'x-internal-api-key': 'test-key', 'x-user-id': input.userId, 'x-workspace-id': input.workspaceId,
    } }));
  });
  it.each(['SUBMITTED', 'APPROVED', 'REIMBURSED'])('rejects uneditable %s expenses', async status => {
    responses({ ...expense, status }); await expect(adapter.validate(input)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('rejects cross-workspace resources', async () => {
    responses(expense, { ...category, workspaceId: randomUUID() });
    await expect(adapter.validate(input)).rejects.toMatchObject({ statusCode: 404 });
  });
  it('rejects inactive categories', async () => {
    responses(expense, { ...category, isActive: false });
    await expect(adapter.validate(input)).rejects.toMatchObject({ statusCode: 409 });
  });
  it.each([401, 429, 500])('fails closed on upstream HTTP %i', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(adapter.validate(input)).rejects.toMatchObject({ statusCode: 503 });
  });
  it('fails closed on malformed data and network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":{}}')));
    await expect(adapter.validate(input)).rejects.toMatchObject({ statusCode: 503 });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(adapter.validate(input)).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('Credential-bearing HTTP transport', () => {
  it('rejects redirects without forwarding the actor or internal key to another endpoint', async () => {
    let redirectedRequests = 0;
    const server = createServer((request, reply) => {
      if (request.url === '/redirect-target') { redirectedRequests++; reply.end('{}'); return; }
      reply.writeHead(302, { location: '/redirect-target' }); reply.end();
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP server');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    vi.stubEnv('INTERNAL_API_KEY', 'test-key'); vi.stubEnv('EXPENSE_SERVICE_URL', baseUrl);
    try {
      await expect(new HttpSuggestionAcceptanceAdapter({ expenseServiceUrl: baseUrl, internalApiKey: 'test-key' }).validate(input))
        .rejects.toMatchObject({ statusCode: 503 });
      await expect(new HttpCategorizationReferenceAdapter().readExpense(input)).rejects.toMatchObject({ statusCode: 503 });
      await expect(new HttpWorkspaceAccessAdapter({ identityServiceUrl: baseUrl, internalApiKey: 'test-key' })
        .isMember(UserId.fromString(input.userId), WorkspaceId.fromString(input.workspaceId))).rejects.toMatchObject({ statusCode: 503 });
      expect(redirectedRequests).toBe(0);
    } finally {
      server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});

describe('Categorization expense and category references', () => {
  const references = new HttpCategorizationReferenceAdapter();
  const expenseOwnerId = randomUUID();
  const snapshot = { ...expense, userId: expenseOwnerId, amount: '12.50', merchant: 'Shop', paymentMethod: 'CASH' };
  it('reads actual decimal expense data from the owning service', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: snapshot }))));
    await expect(references.readExpense(input)).resolves.toEqual({ expenseOwnerId, expenseData: {
      amount: 12.5, merchant: 'Shop', description: undefined, paymentMethod: 'CASH',
    } });
  });
  it('fails closed if the owner service omits the expense creator', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-key');
    const { userId: _owner, ...withoutOwner } = snapshot;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: withoutOwner }))));
    await expect(references.readExpense(input)).rejects.toMatchObject({ statusCode: 503 });
  });
  it.each(['1e3', 'NaN', '-2', '1.123'])('rejects malformed upstream amounts %s', async amount => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ...snapshot, amount } }))));
    await expect(references.readExpense(input)).rejects.toMatchObject({ statusCode: 503 });
  });
  it('rejects a foreign expense even if the HTTP response is successful', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ...snapshot, workspaceId: randomUUID() } }))));
    await expect(references.readExpense(input)).rejects.toMatchObject({ statusCode: 404 });
  });
  it('rejects foreign and inactive categories before they become rule targets', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ...category, workspaceId: randomUUID() } }))));
    await expect(references.ensureCategory(input)).rejects.toMatchObject({ statusCode: 404 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ...category, isActive: false } }))));
    await expect(references.ensureCategory(input)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('requires internal credentials before calling the owner service', async () => {
    vi.stubEnv('INTERNAL_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn());
    await expect(references.readExpense(input)).rejects.toMatchObject({ statusCode: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
