import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpWorkspaceAuthorizationAdapter } from '../../../shared/infrastructure/auth/http-workspace-authorization.adapter';
import {
  UnauthorizedWorkspaceAccessError,
  IdentityServiceUnavailableError,
  DownstreamServiceError,
} from '../../../shared/errors/workspace-authorization.error';

describe('HttpWorkspaceAuthorizationAdapter', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should authorize valid active member and return context', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          userId: 'user-1',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
      }),
    } as any);

    const adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://localhost:3002',
    });

    const result = await adapter.authorize({
      userId: 'user-1',
      workspaceId: 'ws-1',
    });

    expect(result).toEqual({
      userId: 'user-1',
      workspaceId: 'ws-1',
      role: 'ADMIN',
    });
  });

  it('should throw UnauthorizedWorkspaceAccessError if identity service returns 403 or 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    } as any);

    const adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://localhost:3002',
    });

    await expect(
      adapter.authorize({
        userId: 'user-intruder',
        workspaceId: 'ws-1',
      })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it('should throw UnauthorizedWorkspaceAccessError if user lacks required role', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          userId: 'user-member',
          workspaceId: 'ws-1',
          role: 'MEMBER',
        },
      }),
    } as any);

    const adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://localhost:3002',
    });

    await expect(
      adapter.authorize({
        userId: 'user-member',
        workspaceId: 'ws-1',
        requiredRole: 'ADMIN',
      })
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
  });

  it('should throw IdentityServiceUnavailableError on timeout or network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out'));

    const adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://localhost:3002',
      timeoutMs: 100,
    });

    await expect(
      adapter.authorize({
        userId: 'user-1',
        workspaceId: 'ws-1',
      })
    ).rejects.toThrow(IdentityServiceUnavailableError);
  });

  it('should throw IdentityServiceUnavailableError on downstream 5xx server error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as any);

    const adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://localhost:3002',
    });

    await expect(
      adapter.authorize({
        userId: 'user-1',
        workspaceId: 'ws-1',
      })
    ).rejects.toThrow(IdentityServiceUnavailableError);
  });

  it('should throw DownstreamServiceError on invalid JSON payload from identity service', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as any);

    const adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://localhost:3002',
    });

    await expect(
      adapter.authorize({
        userId: 'user-1',
        workspaceId: 'ws-1',
      })
    ).rejects.toThrow(DownstreamServiceError);
  });

  it('should throw DownstreamServiceError on malformed membership schema from identity service', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          // Missing workspaceId and role
          foo: 'bar',
        },
      }),
    } as any);

    const adapter = new HttpWorkspaceAuthorizationAdapter({
      identityServiceUrl: 'http://localhost:3002',
    });

    await expect(
      adapter.authorize({
        userId: 'user-1',
        workspaceId: 'ws-1',
      })
    ).rejects.toThrow(DownstreamServiceError);
  });
});
