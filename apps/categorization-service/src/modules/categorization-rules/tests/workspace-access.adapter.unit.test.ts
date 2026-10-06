import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { UserId, WorkspaceId } from '@core/domain/value-objects';
import { HttpWorkspaceAccessAdapter, WorkspaceAccessUnavailableError } from '../infrastructure/adapters/http-workspace-access.adapter';
import { PrismaRepositoryHelper, PaginationValidationError } from '../../../shared/infrastructure/persistence/prisma-repository.helper';

const userId = UserId.fromString(randomUUID()), workspaceId = WorkspaceId.fromString(randomUUID());
const adapter = () => new HttpWorkspaceAccessAdapter({ identityServiceUrl: 'http://identity.test', internalApiKey: 'test-only-key' });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Workspace authorization port implementation', () => {
  it.each(['owner', 'admin', 'manager', 'member', 'MEMBER'])('allows verified workspace role %s to read', async role => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId: userId.getValue(), workspaceId: workspaceId.getValue(), role } }))));
    expect(await adapter().isMember(userId, workspaceId)).toBe(true);
  });
  it('rejects unknown roles for member access', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId: userId.getValue(), workspaceId: workspaceId.getValue(), role: 'unknown' } }))));
    expect(await adapter().isMember(userId, workspaceId)).toBe(false);
  });
  it.each(['owner', 'admin', 'OWNER', 'ADMIN'])('authorizes verified role %s with authenticated actor headers', async role => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId: userId.getValue(), workspaceId: workspaceId.getValue(), role } })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await adapter().isAdminOrOwner(userId, workspaceId)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`http://identity.test/api/v1/workspaces/${workspaceId.getValue()}/members/${userId.getValue()}`,
      expect.objectContaining({ headers: { 'x-internal-api-key': 'test-only-key', 'x-user-id': userId.getValue() }, signal: expect.any(AbortSignal) }));
  });
  it.each(['member', 'manager', 'unknown'])('denies verified non-admin role %s', async role => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId: userId.getValue(), workspaceId: workspaceId.getValue(), role } }))));
    expect(await adapter().isAdminOrOwner(userId, workspaceId)).toBe(false);
  });
  it.each([403, 404])('returns denial for membership status %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
    expect(await adapter().isAdminOrOwner(userId, workspaceId)).toBe(false);
  });
  it.each([401, 429, 500, 503])('distinguishes dependency/auth failure %s from denied membership', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
    await expect(adapter().isAdminOrOwner(userId, workspaceId)).rejects.toBeInstanceOf(WorkspaceAccessUnavailableError);
  });
  it('rejects network and malformed-response failures', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('connection refused')).mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('invalid JSON'));
    vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 3; i++) await expect(adapter().isAdminOrOwner(userId, workspaceId)).rejects.toBeInstanceOf(WorkspaceAccessUnavailableError);
  });
  it.each(['workspaceId', 'userId'])('denies mismatched response %s', async field => {
    const data = { userId: userId.getValue(), workspaceId: workspaceId.getValue(), role: 'owner', [field]: randomUUID() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data }))));
    expect(await adapter().isAdminOrOwner(userId, workspaceId)).toBe(false);
  });
  it('does not issue an anonymous request when the internal credential is absent', async () => {
    vi.stubEnv('INTERNAL_API_KEY', ''); const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(new HttpWorkspaceAccessAdapter().isAdminOrOwner(userId, workspaceId)).rejects.toBeInstanceOf(WorkspaceAccessUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Repository pagination input contract', () => {
  it.each([{ limit: 0 }, { limit: 101 }, { limit: NaN }, { limit: 1.5 }, { offset: -1 }, { offset: Infinity }, { offset: 0.5 }, { offset: 2147483648 }])('rejects invalid options %j before database access', async options => {
    const delegate = { findMany: vi.fn(), count: vi.fn() };
    await expect(PrismaRepositoryHelper.paginate(delegate, {}, row => row, options)).rejects.toBeInstanceOf(PaginationValidationError);
    expect(delegate.findMany).not.toHaveBeenCalled(); expect(delegate.count).not.toHaveBeenCalled();
  });
});
