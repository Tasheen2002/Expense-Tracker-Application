import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBankFeedApp } from '../../../app';
import { ResponseHelper } from '../../../shared/response.helper';
import { paginationQuerySchema, syncTransactionsBodySchema } from '../infrastructure/http/validation/bank-sync.schema';

describe('Bank feed HTTP boundaries', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('rejects missing internal credentials and malformed actor IDs', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'review-secret');
    const app = await buildBankFeedApp({ logger: false });
    try {
      const url = `/api/v1/workspaces/${crypto.randomUUID()}/bank-feed-sync/connections`;
      expect((await app.inject({ url })).statusCode).toBe(403);
      expect((await app.inject({ url, headers: { 'x-internal-api-key': 'review-secret', 'x-user-id': 'invalid' } })).statusCode).toBe(401);
    } finally { await app.close(); }
  });

  it('denies viewer mutations and validates connection pagination before dispatch', async () => {
    const workspaceId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      data: { userId, workspaceId, role: 'VIEWER' },
    }), { status: 200 })));
    const app = await buildBankFeedApp({ enableInternalAuth: false, logger: false });
    const process = vi.spyOn(app.compositionRoot.bankTransactionController, 'processTransaction');
    const list = vi.spyOn(app.compositionRoot.bankConnectionController, 'getConnections');
    try {
      const headers = { 'x-user-id': userId };
      const response = await app.inject({ method: 'PUT', headers,
        url: `/api/v1/workspaces/${workspaceId}/bank-feed-sync/transactions/${crypto.randomUUID()}/process`, payload: { action: 'ignore' },
      });
      expect(response.statusCode).toBe(403);
      expect(process).not.toHaveBeenCalled();
      for (const query of ['limit=101', 'offset=2147483648', 'limit=2junk']) {
        expect((await app.inject({ headers, url: `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections?${query}` })).statusCode).toBe(400);
      }
      expect(list).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it('counts each mutation once across feature route groups', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INTERNAL_API_KEY', 'review-secret');
    const workspaceId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      data: { userId, workspaceId, role: 'ADMIN' },
    }), { status: 200 })));
    const app = await buildBankFeedApp({ logger: false });
    vi.spyOn(app.compositionRoot.bankConnectionController, 'disconnectBank').mockImplementation(async (_request, reply) => reply.code(204).send());
    try {
      const request = { method: 'POST' as const, headers: { 'x-user-id': userId, 'x-internal-api-key': 'review-secret' },
        url: `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections/${crypto.randomUUID()}/disconnect` };
      for (let i = 0; i < 30; i++) expect((await app.inject(request)).statusCode).toBe(204);
      expect((await app.inject(request)).statusCode).toBe(429);
    } finally { await app.close(); }
  });

  it('sanitizes controller and plugin server errors in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INTERNAL_API_KEY', 'review-secret');
    const app = await buildBankFeedApp({ logger: false });
    app.get('/test-controller-error', (_request, reply) => ResponseHelper.error(reply, Object.assign(new Error('private database secret'), { statusCode: 503, code: 'PRIVATE' })));
    app.get('/test-plugin-error', () => { throw Object.assign(new Error('private database secret'), { statusCode: 503 }); });
    app.get('/test-domain-error', (_request, reply) => ResponseHelper.error(reply, Object.assign(new Error('Invalid amount'), { statusCode: 422, code: 'INVALID_AMOUNT' })));
    try {
      for (const url of ['/test-controller-error', '/test-plugin-error']) {
        const response = await app.inject({ url, headers: { 'x-internal-api-key': 'review-secret' } });
        expect(response.statusCode).toBe(503);
        expect(response.body).not.toContain('private');
        expect(response.body).not.toContain('PRIVATE');
      }
      expect((await app.inject({ url: '/test-domain-error', headers: { 'x-internal-api-key': 'review-secret' } })).json()).toMatchObject({ message: 'Invalid amount', code: 'INVALID_AMOUNT' });
    } finally { await app.close(); }
  });

  it('uses one timestamp contract and rejects unsupported forced syncs', () => {
    expect(syncTransactionsBodySchema.safeParse({ fromDate: '2026-01-01' }).success).toBe(false);
    expect(syncTransactionsBodySchema.parse({ fromDate: '2026-01-01T00:00:00+05:30' }).fromDate).toBeInstanceOf(Date);
    expect(syncTransactionsBodySchema.safeParse({ forceSync: true }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: '2junk' }).success).toBe(false);
  });

  it('keeps app database clients and their shutdown independent', async () => {
    const first = await buildBankFeedApp({ enableInternalAuth: false, logger: false });
    const second = await buildBankFeedApp({ enableInternalAuth: false, logger: false });
    const firstClose = vi.spyOn(first.prisma, '$disconnect');
    const secondClose = vi.spyOn(second.prisma, '$disconnect');
    try {
      expect(first.prisma).not.toBe(second.prisma);
      await first.close();
      expect(firstClose).toHaveBeenCalledOnce();
      expect(secondClose).not.toHaveBeenCalled();
    } finally { await first.close(); await second.close(); }
  });

  it('does not keep a closed process alive for rate-limit cleanup', async () => {
    vi.resetModules();
    const interval = vi.spyOn(globalThis, 'setInterval');
    await import('@shared/middleware/rate-limiter.middleware');
    const timer = interval.mock.results[0].value as NodeJS.Timeout;
    try { expect(timer.hasRef()).toBe(false); }
    finally { clearInterval(timer); }
  });
});

