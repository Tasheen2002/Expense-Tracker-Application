import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerAuditOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';
import { AuditLogRepositoryImpl } from '../infrastructure/persistence/audit-log.repository.impl';
import { AuditService } from '../application/services/audit.service';
import { AuditLogId } from '../domain/value-objects/audit-log-id.vo';

describe('audit PostgreSQL contract', () => {
  const prisma = new PrismaClient();
  const app = Fastify({ logger: false });
  const createdIds: string[] = [];

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
    await registerAuditOutboxEventRoutes(app, new AuditService(new AuditLogRepositoryImpl(prisma)));
    await app.ready();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { id: { in: createdIds } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('stores one audit record when the same event is delivered concurrently', async () => {
    const eventId = randomUUID();
    const workspaceId = randomUUID();
    createdIds.push(eventId);
    const request = {
      method: 'POST' as const,
      url: '/event-outbox/events',
      payload: {
        eventId,
        eventType: 'expense.submitted',
        aggregateType: 'Expense',
        aggregateId: randomUUID(),
        payload: { workspaceId, submittedBy: randomUUID() },
        timestamp: new Date().toISOString(),
      },
    };

    const responses = await Promise.all([app.inject(request), app.inject(request)]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 201]);
    expect(await prisma.auditLog.count({ where: { id: eventId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { id: eventId, workspaceId } })).toBe(1);
    expect((await prisma.auditLog.findUniqueOrThrow({ where: { id: eventId } })).userId)
      .toBe(request.payload.payload.submittedBy);
    expect((await prisma.auditLog.findUniqueOrThrow({ where: { id: eventId } })).createdAt.toISOString())
      .toBe(request.payload.timestamp);
  });

  it('rejects a reused event ID with different content without overwriting the first audit row', async () => {
    const eventId = randomUUID();
    const workspaceId = randomUUID();
    const actorId = randomUUID();
    createdIds.push(eventId);
    const payload = {
      eventId, eventType: 'expense.submitted', aggregateType: 'Expense',
      aggregateId: randomUUID(), payload: { workspaceId, submittedBy: actorId, amount: 25 },
      timestamp: '2026-01-01T12:00:00.000Z',
    };
    expect((await app.inject({ method: 'POST', url: '/event-outbox/events', payload })).statusCode).toBe(201);
    const conflicting = await app.inject({
      method: 'POST', url: '/event-outbox/events',
      payload: { ...payload, payload: { ...payload.payload, amount: 250 } },
    });
    expect(conflicting.statusCode).toBe(409);
    expect(await prisma.auditLog.count({ where: { id: eventId } })).toBe(1);
    expect((await prisma.auditLog.findUniqueOrThrow({ where: { id: eventId } })).details)
      .toEqual(payload.payload);
  });

  it('persists manual entries with server-owned provenance', async () => {
    const service = new AuditService(new AuditLogRepositoryImpl(prisma));
    const submittedMetadata = { source: 'outbox-event', eventId: randomUUID(), note: 'reviewed' };
    const log = await service.createAuditLog({
      workspaceId: randomUUID(),
      userId: randomUUID(),
      action: 'expense.reviewed',
      entityType: 'Expense',
      entityId: randomUUID(),
      metadata: submittedMetadata,
    });
    createdIds.push(log.id);

    const persisted = await prisma.auditLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(persisted.metadata).toEqual({ source: 'manual-api', submittedMetadata });
  });

  it('purges only the requested workspace and has indexes for scoped reads', async () => {
    const workspaceId = randomUUID();
    const otherWorkspaceId = randomUUID();
    const firstId = randomUUID();
    const secondId = randomUUID();
    createdIds.push(firstId, secondId);
    const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await prisma.auditLog.createMany({
      data: [
        { id: firstId, workspaceId, action: 'expense.created', entityType: 'Expense', entityId: randomUUID(), createdAt: oldDate },
        { id: secondId, workspaceId: otherWorkspaceId, action: 'expense.created', entityType: 'Expense', entityId: randomUUID(), createdAt: oldDate },
      ],
    });

    const repository = new AuditLogRepositoryImpl(prisma);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const actorId = randomUUID();
    expect(await repository.deleteOlderThan(workspaceId, cutoff, actorId, 30)).toBe(1);
    expect(await prisma.auditLog.findUnique({ where: { id: firstId } })).toBeNull();
    expect(await prisma.auditLog.findUnique({ where: { id: secondId } })).not.toBeNull();
    const marker = await prisma.auditLog.findFirstOrThrow({ where: { workspaceId, action: 'audit.logs_purged' } });
    createdIds.push(marker.id);
    expect(marker.userId).toBe(actorId);
    expect(marker.details).toEqual({ deletedCount: 1, olderThanDays: 30 });

    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'audit_compliance' AND tablename = 'audit_logs'
    `;
    expect(indexes.map(({ indexname }) => indexname)).toEqual(expect.arrayContaining([
      'audit_logs_pkey',
      'audit_logs_workspace_timeline_idx',
      'audit_logs_entity_timeline_idx',
      'audit_logs_actor_timeline_idx',
      'audit_logs_action_timeline_idx',
    ]));
  });

  it('scopes single-record reads and period summaries to one workspace', async () => {
    const workspaceId = randomUUID();
    const otherWorkspaceId = randomUUID();
    const [inPeriodId, outOfPeriodId, otherWorkspaceLogId] = [randomUUID(), randomUUID(), randomUUID()];
    createdIds.push(inPeriodId, outOfPeriodId, otherWorkspaceLogId);
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-31T23:59:59Z');
    await prisma.auditLog.createMany({ data: [
      { id: inPeriodId, workspaceId, action: 'expense.created', entityType: 'Expense', entityId: randomUUID(), createdAt: new Date('2026-01-15T00:00:00Z') },
      { id: outOfPeriodId, workspaceId, action: 'expense.created', entityType: 'Expense', entityId: randomUUID(), createdAt: new Date('2026-02-15T00:00:00Z') },
      { id: otherWorkspaceLogId, workspaceId: otherWorkspaceId, action: 'expense.created', entityType: 'Expense', entityId: randomUUID(), createdAt: new Date('2026-01-15T00:00:00Z') },
    ] });
    const repository = new AuditLogRepositoryImpl(prisma);
    const service = new AuditService(repository);
    expect(await repository.findById(AuditLogId.fromString(otherWorkspaceLogId), workspaceId)).toBeNull();
    expect(await repository.findById(AuditLogId.fromString(inPeriodId), workspaceId)).not.toBeNull();
    const summary = await service.getAuditSummary(workspaceId, start, end);
    expect(summary.totalLogs).toBe(1);
    expect(summary.actionBreakdown).toEqual([{ action: 'expense.created', count: 1 }]);
    const filtered = await service.listAuditLogs(workspaceId, { startDate: start, endDate: end });
    expect(filtered.items.map((row) => row.id)).toEqual([inPeriodId]);
  });

  it('rolls back purge when its audit marker cannot be stored', async () => {
    const workspaceId = randomUUID();
    const id = randomUUID();
    createdIds.push(id);
    await prisma.auditLog.create({ data: {
      id, workspaceId, action: 'expense.created', entityType: 'Expense',
      entityId: randomUUID(), createdAt: new Date('2025-01-01T00:00:00Z'),
    } });
    const repository = new AuditLogRepositoryImpl(prisma);
    await expect(repository.deleteOlderThan(workspaceId, new Date('2025-02-01T00:00:00Z'), 'invalid-actor-id', 30)).rejects.toThrow();
    expect(await prisma.auditLog.findUnique({ where: { id } })).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { workspaceId, action: 'audit.logs_purged' } })).toBe(0);
  });

  it('uses the audit ID to keep pages stable when timestamps match', async () => {
    const workspaceId = randomUUID();
    const entityId = randomUUID();
    const ids = [randomUUID(), randomUUID()];
    createdIds.push(...ids);
    const createdAt = new Date();
    await prisma.auditLog.createMany({
      data: ids.map((id) => ({
        id,
        workspaceId,
        action: 'expense.created',
        entityType: 'Expense',
        entityId,
        createdAt,
      })),
    });

    const repository = new AuditLogRepositoryImpl(prisma);
    const first = await repository.findByWorkspace(workspaceId, 1, 0);
    const second = await repository.findByWorkspace(workspaceId, 1, 1);
    expect([first.items[0].id.getValue(), second.items[0].id.getValue()])
      .toEqual([...ids].sort().reverse());

    const entityHistory = await repository.findByEntityId(workspaceId, 'Expense', entityId, { limit: 2, offset: 0 });
    expect(entityHistory.items.map((item) => item.id.getValue()))
      .toEqual([...ids].sort().reverse());
  });
});
