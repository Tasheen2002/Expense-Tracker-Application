import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLogRoutes } from '../infrastructure/http/routes/audit-log.routes';
import type { AuditLogController } from '../infrastructure/http/controllers/audit-log.controller';

describe('audit read route authorization', () => {
  const workspaceId = '123e4567-e89b-12d3-a456-426614174001';
  const userId = '123e4567-e89b-12d3-a456-426614174002';
  const listAuditLogs = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.code(200).send({
    success: true,
    statusCode: 200,
    message: 'Audit logs retrieved',
    data: { items: [], total: 0, limit: 50, offset: 0, hasMore: false },
  }));
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeEach(async () => {
    listAuditLogs.mockClear();
    app = Fastify({ logger: false });
    prisma = new PrismaClient();
    app.decorate('prisma', prisma);
    app.decorate('authenticate', async (request) => {
      request.user = { userId, email: 'member@example.test' };
    });
    await auditLogRoutes(app, { listAuditLogs } as unknown as AuditLogController);
    await app.ready();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await app.close();
    await prisma.$disconnect();
  });

  it('does not call a read handler when identity rejects membership', async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 403, ok: false });
    vi.stubGlobal('fetch', fetch);
    const response = await app.inject({ method: 'GET', url: `/workspaces/${workspaceId}/audit-logs` });
    expect(response.statusCode).toBe(403);
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it('rejects a membership response for another workspace', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ data: { workspaceId: '123e4567-e89b-12d3-a456-426614174099', userId, role: 'MEMBER' } }),
    }));
    const response = await app.inject({ method: 'GET', url: `/workspaces/${workspaceId}/audit-logs` });
    expect(response.statusCode).toBe(403);
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it('allows a verified member to reach the read handler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ data: { workspaceId, userId, role: 'MEMBER' } }),
    }));
    const response = await app.inject({ method: 'GET', url: `/workspaces/${workspaceId}/audit-logs` });
    expect(response.statusCode).toBe(200);
    expect(listAuditLogs).toHaveBeenCalledOnce();
  });
});
