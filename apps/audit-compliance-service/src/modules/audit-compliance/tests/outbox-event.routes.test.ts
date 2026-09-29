import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerAuditOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';
import type { AuditService } from '../application/services/audit.service';
import { AuditEventConflictError } from '../domain/errors/audit.errors';

describe('audit outbox webhook', () => {
  let app: FastifyInstance;
  const recordExternalEvent = vi.fn();
  const eventId = '123e4567-e89b-12d3-a456-426614174000';
  const workspaceId = '123e4567-e89b-12d3-a456-426614174001';
  const actorId = '123e4567-e89b-12d3-a456-426614174003';
  const validEvent = {
    eventId,
    eventType: 'expense.submitted',
    aggregateId: '123e4567-e89b-12d3-a456-426614174002',
    aggregateType: 'Expense',
    payload: { workspaceId, submittedBy: actorId },
    timestamp: '2026-01-01T12:00:00.000Z',
  };

  beforeEach(async () => {
    recordExternalEvent.mockReset().mockResolvedValue({ auditLogId: eventId, duplicate: false });
    app = Fastify({ logger: false });
    await registerAuditOutboxEventRoutes(app, { recordExternalEvent } as unknown as AuditService);
    await app.ready();
  });

  afterEach(async () => { await app.close(); });

  it('passes a validated event and its occurrence time into the application layer', async () => {
    const response = await app.inject({ method: 'POST', url: '/event-outbox/events', payload: validEvent });
    expect(response.statusCode).toBe(201);
    expect(response.json().auditLogId).toBe(eventId);
    expect(recordExternalEvent).toHaveBeenCalledWith({
      eventId, eventType: validEvent.eventType, aggregateId: validEvent.aggregateId,
      aggregateType: validEvent.aggregateType, payload: validEvent.payload,
      occurredAt: new Date(validEvent.timestamp),
    });
  });

  it('acknowledges duplicates without creating another entry', async () => {
    recordExternalEvent.mockResolvedValue({ auditLogId: eventId, duplicate: true });
    const response = await app.inject({ method: 'POST', url: '/event-outbox/events', payload: validEvent });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, duplicate: true, auditLogId: eventId });
  });

  it.each([
    [{ ...validEvent, eventId: undefined }],
    [{ ...validEvent, eventType: '' }],
    [{ ...validEvent, timestamp: 'not-a-date' }],
    [{ ...validEvent, payload: { workspaceId: 'invalid' } }],
    [{ ...validEvent, payload: { workspaceId, submittedBy: 'invalid' } }],
  ])('rejects invalid inputs before the application write', async (payload) => {
    const response = await app.inject({ method: 'POST', url: '/event-outbox/events', payload });
    expect(response.statusCode).toBe(400);
    expect(recordExternalEvent).not.toHaveBeenCalled();
  });

  it('accepts a workspace aggregate ID when the payload has no workspace ID', async () => {
    const response = await app.inject({
      method: 'POST', url: '/event-outbox/events',
      payload: { ...validEvent, aggregateType: 'Workspace', aggregateId: workspaceId, payload: {} },
    });
    expect(response.statusCode).toBe(201);
  });

  it('does not expose application or database errors', async () => {
    recordExternalEvent.mockRejectedValue(new Error('private database connection details'));
    const response = await app.inject({ method: 'POST', url: '/event-outbox/events', payload: validEvent });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('private database connection details');
  });

  it('returns a conflict for a reused event ID with different content', async () => {
    recordExternalEvent.mockRejectedValue(new AuditEventConflictError(eventId));
    const response = await app.inject({ method: 'POST', url: '/event-outbox/events', payload: validEvent });
    expect(response.statusCode).toBe(409);
    expect(response.body).not.toContain(validEvent.payload.submittedBy);
  });
});
