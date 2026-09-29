import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildExpenseApp } from '../../../app';

describe('cost-allocation composition wiring', () => {
  it('uses the real Identity Access adapter for reads and writes', async () => {
    const previousKey = process.env.INTERNAL_API_KEY;
    process.env.INTERNAL_API_KEY = 'cost-allocation-wiring-test-key';
    const workspaceId = randomUUID();
    const actorId = randomUUID();
    const departmentCode = `CA${randomUUID().slice(0, 10)}`;
    let role: 'admin' | 'member' | null = 'admin';
    let responseWorkspaceId = workspaceId;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain(`/workspaces/${workspaceId}/members/${actorId}`);
      expect(init.headers).toMatchObject({
        'x-internal-api-key': 'cost-allocation-wiring-test-key',
        'x-user-id': actorId,
      });
      return role === null
        ? { ok: false, status: 404 }
        : {
            ok: true,
            status: 200,
            json: async () => ({ data: { userId: actorId, workspaceId: responseWorkspaceId, role } }),
          };
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = await buildExpenseApp({ enableInternalAuth: false, logger: false });
    const headers = { 'x-user-id': actorId, 'x-user-email': 'actor@example.com' };
    let departmentId: string | undefined;
    try {
      const created = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${workspaceId}/departments`,
        headers,
        payload: { name: 'Wiring test', code: departmentCode },
      });
      expect(created.statusCode).toBe(201);
      departmentId = created.json().data.id;
      expect(fetchMock).toHaveBeenCalledTimes(1);

      role = 'member';
      const read = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${workspaceId}/departments/${departmentId}`,
        headers,
      });
      expect(read.statusCode).toBe(200);
      expect(read.json().data).toMatchObject({ id: departmentId, name: 'Wiring test' });

      const deniedWrite = await app.inject({
        method: 'PUT',
        url: `/api/v1/workspaces/${workspaceId}/departments/${departmentId}`,
        headers,
        payload: { name: 'Unauthorized change' },
      });
      expect(deniedWrite.statusCode).toBe(403);
      expect(deniedWrite.json().code).toBe('UNAUTHORIZED_ALLOCATION_ACCESS');

      role = null;
      const nonMember = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${workspaceId}/departments/${departmentId}`,
        headers,
      });
      expect(nonMember.statusCode).toBe(403);

      role = 'admin';
      responseWorkspaceId = randomUUID();
      const mismatchedResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${workspaceId}/departments/${departmentId}`,
        headers,
      });
      expect(mismatchedResponse.statusCode).toBe(503);
      expect(mismatchedResponse.json().code).toBe('WORKSPACE_AUTHORIZATION_UNAVAILABLE');
    } finally {
      if (departmentId) {
        await app.prisma.outboxEvent.deleteMany({ where: { aggregateId: departmentId } });
        await app.prisma.department.deleteMany({ where: { id: departmentId, workspaceId } });
      }
      await app.close();
      vi.unstubAllGlobals();
      if (previousKey === undefined) delete process.env.INTERNAL_API_KEY;
      else process.env.INTERNAL_API_KEY = previousKey;
    }
  });
});
