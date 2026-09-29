import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaWorkspaceAccessAdapter } from '../infrastructure/adapters/prisma-workspace-access.adapter';
import { WorkspaceAuthorizationUnavailableError } from '../domain/errors/cost-allocation.errors';

const userId = '123e4567-e89b-42d3-a456-426614174000';
const workspaceId = '123e4567-e89b-42d3-a456-426614174001';

describe('workspace access adapter', () => {
  const previousKey = process.env.INTERNAL_API_KEY;
  afterEach(() => {
    vi.unstubAllGlobals();
    if (previousKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = previousKey;
  });

  it('authenticates its request and accepts only a matching admin membership', async () => {
    process.env.INTERNAL_API_KEY = 'test-secret';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { userId, workspaceId, role: 'admin' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(new PrismaWorkspaceAccessAdapter().isAdminOrOwner(userId, workspaceId)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${workspaceId}/members/${userId}`),
      expect.objectContaining({ headers: { 'x-internal-api-key': 'test-secret', 'x-user-id': userId } }),
    );
  });

  it('rejects a membership for a different workspace', async () => {
    process.env.INTERNAL_API_KEY = 'test-secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { userId, workspaceId: 'other', role: 'owner' } }),
    }));
    await expect(new PrismaWorkspaceAccessAdapter().isAdminOrOwner(userId, workspaceId))
      .rejects.toThrow(WorkspaceAuthorizationUnavailableError);
  });

  it('allows an ordinary member to read without granting management access', async () => {
    process.env.INTERNAL_API_KEY = 'test-secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { userId, workspaceId, role: 'member' } }),
    }));
    const adapter = new PrismaWorkspaceAccessAdapter();
    await expect(adapter.isMember(userId, workspaceId)).resolves.toBe(true);
    await expect(adapter.isAdminOrOwner(userId, workspaceId)).resolves.toBe(false);
  });

  it('denies missing membership and fails closed on an unknown role', async () => {
    process.env.INTERNAL_API_KEY = 'test-secret';
    const fetchMock = vi.fn().mockResolvedValueOnce({ status: 404, ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { userId, workspaceId, role: 'unknown' } }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PrismaWorkspaceAccessAdapter();
    await expect(adapter.isMember(userId, workspaceId)).resolves.toBe(false);
    await expect(adapter.isMember(userId, workspaceId)).rejects.toThrow(WorkspaceAuthorizationUnavailableError);
  });

  it('fails closed when the service credential is missing', async () => {
    delete process.env.INTERNAL_API_KEY;
    await expect(new PrismaWorkspaceAccessAdapter().isAdminOrOwner(userId, workspaceId))
      .rejects.toThrow(WorkspaceAuthorizationUnavailableError);
  });
});
