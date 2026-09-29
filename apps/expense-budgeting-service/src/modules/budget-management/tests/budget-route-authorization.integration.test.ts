import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { buildExpenseApp } from '../../../app';

describe('budget route authorization with real middleware', () => {
  let app: FastifyInstance;
  const workspaceId = randomUUID();
  const userId = randomUUID();
  const originalFetch = globalThis.fetch;

  beforeAll(async () => {
    app = await buildExpenseApp({ enableInternalAuth: false, logger: false });
    await app.ready();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  const headers = { 'x-user-id': userId, authorization: 'Bearer test-context' };
  const url = `/api/v1/workspaces/${workspaceId}/budgets`;

  it('denies a user who is not a member of the requested workspace', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false });
    const response = await app.inject({ method: 'GET', url, headers });
    expect(response.statusCode).toBe(403);
  });

  it('rejects a membership response for a different workspace', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ data: { workspaceId: randomUUID(), userId, role: 'ADMIN' } }),
    });
    const response = await app.inject({ method: 'GET', url, headers });
    expect(response.statusCode).toBe(403);
  });

  it('allows member reads but blocks member writes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ data: { workspaceId, userId, role: 'MEMBER' } }),
    });
    const read = await app.inject({ method: 'GET', url, headers });
    expect(read.statusCode).toBe(200);

    const write = await app.inject({
      method: 'POST', url, headers,
      payload: {
        name: 'Unauthorized budget', totalAmount: 10, currency: 'USD',
        periodType: 'MONTHLY', startDate: new Date().toISOString(),
      },
    });
    expect(write.statusCode).toBe(403);
  });

  it('restricts alert acknowledgement to workspace admins', async () => {
    const alertUrl = `/api/v1/workspaces/${workspaceId}/budgets/alerts/${randomUUID()}/read`;
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ data: { workspaceId, userId, role: 'MEMBER' } }),
    });
    const denied = await app.inject({ method: 'PATCH', url: alertUrl, headers });
    expect(denied.statusCode).toBe(403);

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ data: { workspaceId, userId, role: 'ADMIN' } }),
    });
    const missing = await app.inject({ method: 'PATCH', url: alertUrl, headers });
    expect(missing.statusCode).toBe(404);
  });
});
