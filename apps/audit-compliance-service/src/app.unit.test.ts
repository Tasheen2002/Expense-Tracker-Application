import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAuditComplianceApp } from './app';

function fakePrisma() {
  return {
    auditLog: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

describe('audit application wiring', () => {
  const apps: FastifyInstance[] = [];

  beforeEach(() => { vi.stubEnv('INTERNAL_API_KEY', 'test-internal-key'); });
  afterEach(async () => {
    for (const app of apps.splice(0)) await app.close();
    vi.unstubAllEnvs();
  });

  it('protects the production-style webhook and uses the injected database', async () => {
    const prisma = fakePrisma();
    const app = await buildAuditComplianceApp({ prisma: prisma as unknown as PrismaClient, logger: false });
    apps.push(app);
    const event = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      eventType: 'expense.created',
      aggregateType: 'Expense',
      aggregateId: '123e4567-e89b-12d3-a456-426614174001',
      payload: { workspaceId: '123e4567-e89b-12d3-a456-426614174002' },
    };
    const withoutKey = await app.inject({ method: 'POST', url: '/api/v1/event-outbox/events', payload: event });
    expect(withoutKey.statusCode).toBe(403);
    expect(prisma.auditLog.createMany).not.toHaveBeenCalled();

    const withKey = await app.inject({
      method: 'POST', url: '/api/v1/event-outbox/events',
      headers: { 'x-internal-api-key': 'test-internal-key' }, payload: event,
    });
    expect(withKey.statusCode).toBe(201);
    expect(prisma.auditLog.createMany).toHaveBeenCalledOnce();
  });

  it('keeps Prisma ownership within each app instance', async () => {
    const firstPrisma = fakePrisma();
    const secondPrisma = fakePrisma();
    const first = await buildAuditComplianceApp({ prisma: firstPrisma as unknown as PrismaClient, logger: false });
    const second = await buildAuditComplianceApp({ prisma: secondPrisma as unknown as PrismaClient, logger: false });
    apps.push(first, second);
    await first.close();
    apps.shift();
    expect(firstPrisma.$disconnect).toHaveBeenCalledOnce();
    expect(secondPrisma.$disconnect).not.toHaveBeenCalled();
    expect((await second.inject('/health')).statusCode).toBe(200);
  });

  it('sanitizes health and unhandled server errors', async () => {
    const prisma = fakePrisma();
    prisma.$queryRaw.mockRejectedValue(new Error('private database connection details'));
    const app = await buildAuditComplianceApp({ prisma: prisma as unknown as PrismaClient, logger: false });
    apps.push(app);
    app.get('/boom', async () => {
      throw Object.assign(new Error('private internal error'), { statusCode: 503 });
    });
    const health = await app.inject('/health');
    expect(health.statusCode).toBe(503);
    expect(health.body).not.toContain('private database connection details');
    const error = await app.inject({ url: '/boom', headers: { 'x-internal-api-key': 'test-internal-key' } });
    expect(error.statusCode).toBe(503);
    expect(error.body).not.toContain('private internal error');
  });

  it('refuses to disable internal authentication in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(buildAuditComplianceApp({ enableInternalAuth: false, logger: false })).rejects.toThrow();
  });
});
