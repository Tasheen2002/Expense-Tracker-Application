import { randomUUID } from 'node:crypto';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AllocationManagementController } from '../infrastructure/http/controllers/allocation-management.controller';
import { ExpenseAllocationController } from '../infrastructure/http/controllers/expense-allocation.controller';
import { registerCostAllocationRoutes } from '../infrastructure/http/routes';

describe('cost-allocation write rate limiting', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('authenticates first, counts each write once across route files, and isolates users', async () => {
    const app = Fastify();
    const workspaceId = randomUUID();
    const departmentId = randomUUID();
    const expenseId = randomUUID();
    const userA = randomUUID();
    const userB = randomUUID();
    const deleteDepartment = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.status(204).send());
    const deleteAllocations = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.status(204).send());

    app.decorate('authenticate', async (request: FastifyRequest) => {
      const userId = request.headers['x-user-id'];
      if (typeof userId !== 'string') {
        throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
      }
      request.user = { userId, email: `${userId}@example.com` };
    });

    await registerCostAllocationRoutes(app, {
      allocationManagementController: { deleteDepartment } as unknown as AllocationManagementController,
      expenseAllocationController: {
        deleteAllocations,
        getAllocationSummary: async (_request: FastifyRequest, reply: FastifyReply) => reply.status(200).send({
          success: true,
          statusCode: 200,
          message: 'Summary',
          data: { totalAllocations: 0, byDepartment: [], byCostCenter: [], byProject: [] },
        }),
      } as unknown as ExpenseAllocationController,
    });

    const departmentUrl = `/api/v1/workspaces/${workspaceId}/departments/${departmentId}`;
    const allocationUrl = `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}/allocations`;
    const summaryUrl = `/api/v1/workspaces/${workspaceId}/allocations/summary`;
    const write = (url: string, userId: string) => app.inject({ method: 'DELETE', url, headers: { 'x-user-id': userId } });

    try {
      const unauthenticated = await app.inject({ method: 'DELETE', url: departmentUrl });
      expect(unauthenticated.statusCode).toBe(401);
      expect(unauthenticated.headers['x-ratelimit-remaining']).toBeUndefined();

      const first = await write(departmentUrl, userA);
      expect(first.statusCode).toBe(204);
      expect(first.headers['x-ratelimit-remaining']).toBe('29');

      const second = await write(allocationUrl, userA);
      expect(second.statusCode).toBe(204);
      expect(second.headers['x-ratelimit-remaining']).toBe('28');

      const otherUser = await write(allocationUrl, userB);
      expect(otherUser.statusCode).toBe(204);
      expect(otherUser.headers['x-ratelimit-remaining']).toBe('29');

      const read = await app.inject({ method: 'GET', url: summaryUrl, headers: { 'x-user-id': userA } });
      expect(read.statusCode).toBe(200);
      expect(read.headers['x-ratelimit-remaining']).toBeUndefined();

      for (let count = 3; count <= 30; count++) {
        const response = await write(departmentUrl, userA);
        expect(response.statusCode).toBe(204);
        expect(response.headers['x-ratelimit-remaining']).toBe(String(30 - count));
      }
      expect((await write(allocationUrl, userA)).statusCode).toBe(429);
      expect((await write(departmentUrl, userB)).headers['x-ratelimit-remaining']).toBe('28');
      expect(deleteDepartment).toHaveBeenCalledTimes(30);
      expect(deleteAllocations).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });
});
