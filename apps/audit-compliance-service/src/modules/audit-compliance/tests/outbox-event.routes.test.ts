import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerAuditOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';

describe('Audit Compliance - Outbox Webhook Consumer & Idempotency', () => {
  let app: FastifyInstance;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      auditLog: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    app = Fastify({ logger: false });
    await registerAuditOutboxEventRoutes(app, mockPrisma);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should successfully record an outbox event as an audit log', async () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';
    mockPrisma.auditLog.findUnique.mockResolvedValue(null);
    mockPrisma.auditLog.create.mockResolvedValue({
      id: eventId,
      workspaceId: '123e4567-e89b-12d3-a456-426614174001',
      action: 'ExpenseCreated',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventId,
        eventType: 'ExpenseCreated',
        aggregateId: '123e4567-e89b-12d3-a456-426614174002',
        aggregateType: 'Expense',
        payload: {
          workspaceId: '123e4567-e89b-12d3-a456-426614174001',
          amount: 250,
        },
        timestamp: new Date().toISOString(),
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.auditLogId).toBe(eventId);
    expect(mockPrisma.auditLog.findUnique).toHaveBeenCalledWith({ where: { id: eventId } });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('should be idempotent and ignore duplicate event deliveries', async () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';
    // Simulate event was already processed previously
    mockPrisma.auditLog.findUnique.mockResolvedValue({
      id: eventId,
      workspaceId: '123e4567-e89b-12d3-a456-426614174001',
      action: 'ExpenseCreated',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventId,
        eventType: 'ExpenseCreated',
        aggregateId: '123e4567-e89b-12d3-a456-426614174002',
        aggregateType: 'Expense',
        payload: {
          workspaceId: '123e4567-e89b-12d3-a456-426614174001',
          amount: 250,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(body.message).toContain('already processed');
    // Ensure duplicate did NOT create another database record
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('should reject invalid events missing required eventId or eventType', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventType: 'ExpenseCreated', // missing eventId
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Validation failed');
  });
});
