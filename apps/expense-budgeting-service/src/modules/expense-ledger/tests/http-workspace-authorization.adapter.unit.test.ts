import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpWorkspaceAuthorizationAdapter } from '../infrastructure/adapters/http-workspace-authorization.adapter';
import {
  UnauthorizedWorkspaceAccessError,
  IdentityServiceUnavailableError,
  DownstreamServiceError,
} from '../domain/errors/workspace-authorization.error';
import { WorkspaceRole } from '../application/ports/workspace-authorization.port';

describe('HttpWorkspaceAuthorizationAdapter (Unit)', () => {
  const originalFetch = globalThis.fetch;
  let adapter: HttpWorkspaceAuthorizationAdapter;

  beforeEach(() => {
    adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://identity-service:3002',
      internalApiKey: 'test-internal-key',
      timeoutMs: 1000,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws UnauthorizedWorkspaceAccessError if userId or workspaceId is missing', async () => {
    await expect(
      adapter.authorize({ userId: '', workspaceId: 'ws-1' })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);

    await expect(
      adapter.authorize({ userId: 'u-1', workspaceId: '' })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it('throws IdentityServiceUnavailableError on network failure or timeout', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      adapter.authorize({ userId: 'u-1', workspaceId: 'ws-1' })
    ).rejects.toThrow(IdentityServiceUnavailableError);
  });

  it('throws UnauthorizedWorkspaceAccessError on 401, 403, or 404 responses', async () => {
    for (const status of [401, 403, 404]) {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status,
        ok: false,
      } as Response);

      await expect(
        adapter.authorize({ userId: 'u-1', workspaceId: 'ws-1' })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    }
  });

  it('throws IdentityServiceUnavailableError on 500+ responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 502,
      ok: false,
    } as Response);

    await expect(
      adapter.authorize({ userId: 'u-1', workspaceId: 'ws-1' })
    ).rejects.toThrow(IdentityServiceUnavailableError);
  });

  it('throws DownstreamServiceError on malformed JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    } as unknown as Response);

    await expect(
      adapter.authorize({ userId: 'u-1', workspaceId: 'ws-1' })
    ).rejects.toThrow(DownstreamServiceError);
  });

  it('throws DownstreamServiceError on missing required fields in JSON schema', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { unexpected: true } }),
    } as unknown as Response);

    await expect(
      adapter.authorize({ userId: 'u-1', workspaceId: 'ws-1' })
    ).rejects.toThrow(DownstreamServiceError);
  });

  it('throws UnauthorizedWorkspaceAccessError on workspaceId mismatch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { workspaceId: 'other-ws', role: 'MEMBER', userId: 'u-1' },
      }),
    } as unknown as Response);

    await expect(
      adapter.authorize({ userId: 'u-1', workspaceId: 'ws-1' })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it('enforces role hierarchy and throws when user role is lower than required role', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { workspaceId: 'ws-1', role: 'MEMBER', userId: 'u-1' },
      }),
    } as unknown as Response);

    await expect(
      adapter.authorize({
        userId: 'u-1',
        workspaceId: 'ws-1',
        requiredRole: 'ADMIN',
      })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it('succeeds when user role satisfies or exceeds required role hierarchy', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { workspaceId: 'ws-1', role: 'OWNER', userId: 'u-1' },
      }),
    } as unknown as Response);

    const result = await adapter.authorize({
      userId: 'u-1',
      workspaceId: 'ws-1',
      requiredRole: 'ADMIN',
    });

    expect(result).toEqual({
      userId: 'u-1',
      workspaceId: 'ws-1',
      role: 'OWNER',
    });
  });

  it('supports root-level response format without data wrapper', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        workspaceId: 'ws-1',
        role: 'ADMIN',
        userId: 'u-1',
      }),
    } as unknown as Response);

    const result = await adapter.authorize({
      userId: 'u-1',
      workspaceId: 'ws-1',
    });

    expect(result).toEqual({
      userId: 'u-1',
      workspaceId: 'ws-1',
      role: 'ADMIN',
    });
  });

  it('fails closed and rejects when requiredRole is unknown or contains a typo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { workspaceId: 'ws-1', role: 'OWNER', userId: 'u-1' },
      }),
    } as unknown as Response);

    await expect(
      adapter.authorize({
        userId: 'u-1',
        workspaceId: 'ws-1',
        requiredRole: 'ADMN' as unknown as WorkspaceRole,
      })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it('fails closed and rejects when user role returned by identity service is unrecognized', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { workspaceId: 'ws-1', role: 'UNKNOWN_ROLE', userId: 'u-1' },
      }),
    } as unknown as Response);

    await expect(
      adapter.authorize({
        userId: 'u-1',
        workspaceId: 'ws-1',
        requiredRole: 'MEMBER',
      })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it('fails closed and throws when downstream membership contains mismatched user ID', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { workspaceId: 'ws-1', role: 'MEMBER', userId: 'different-user' },
      }),
    } as unknown as Response);

    await expect(
      adapter.authorize({
        userId: 'u-1',
        workspaceId: 'ws-1',
      })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });
});
