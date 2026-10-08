import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { HttpExpenseReferenceAdapter } from '../infrastructure/adapters/http-expense-reference.adapter';

describe('Expense ownership adapter', () => {
  const adapter = new HttpExpenseReferenceAdapter();
  const expenseId = randomUUID(), workspaceId = randomUUID(), actorId = randomUUID();
  beforeEach(() => { vi.stubEnv('INTERNAL_API_KEY', 'test-only-internal-key'); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('checks the actual expense and forwards actor credentials without following redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { expenseId, workspaceId } })));
    vi.stubGlobal('fetch', fetchMock);
    await adapter.assertInWorkspace(expenseId, workspaceId, actorId, 'Bearer test-token');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`/workspaces/${workspaceId}/expenses/${expenseId}`), expect.objectContaining({ redirect: 'error', headers: expect.objectContaining({ 'x-user-id': actorId, authorization: 'Bearer test-token' }) }));
  });
  it.each([403, 404])('rejects inaccessible expense: HTTP %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(adapter.assertInWorkspace(expenseId, workspaceId, actorId)).rejects.toMatchObject({ statusCode: 404 });
  });
  it('rejects another workspace even when upstream returns success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { expenseId, workspaceId: randomUUID() } }))));
    await expect(adapter.assertInWorkspace(expenseId, workspaceId, actorId)).rejects.toMatchObject({ statusCode: 404 });
  });
  it.each(['unavailable', 'malformed'])('fails closed when upstream is %s', async mode => {
    vi.stubGlobal('fetch', mode === 'unavailable' ? vi.fn().mockRejectedValue(new Error('offline')) : vi.fn().mockResolvedValue(new Response('{}')));
    await expect(adapter.assertInWorkspace(expenseId, workspaceId, actorId)).rejects.toMatchObject({ statusCode: 503 });
  });
  it('fails closed without internal credentials', async () => {
    vi.stubEnv('INTERNAL_API_KEY', '');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(adapter.assertInWorkspace(expenseId, workspaceId, actorId)).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
