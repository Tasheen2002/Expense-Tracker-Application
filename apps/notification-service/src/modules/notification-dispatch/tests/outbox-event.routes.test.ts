import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import type { Prisma } from '../../../prisma-client';
import { registerNotificationOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';

describe('Notification Service - Outbox Webhook Consumer & Idempotency', () => {
  let app: FastifyInstance;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      notification: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
      notificationRequest: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    mockPrisma.$transaction = vi.fn(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma));

    app = Fastify({ logger: false });
    await registerNotificationOutboxEventRoutes(app, mockPrisma);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should successfully create an in-app notification from an approved expense event', async () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';
    const recipientId = '123e4567-e89b-12d3-a456-426614174001';
    const workspaceId = '123e4567-e89b-12d3-a456-426614174002';

    mockPrisma.notification.findUnique.mockResolvedValue(null);
    mockPrisma.notification.create.mockResolvedValue({
      id: eventId,
      recipientId,
      workspaceId,
      type: 'EXPENSE_APPROVED',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventId,
        eventType: 'expense.approved',
        aggregateId: '123e4567-e89b-12d3-a456-426614174003',
        aggregateType: 'Expense',
        payload: {
          userId: recipientId,
          workspaceId,
          title: 'Client Lunch',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.notificationId).toBe(eventId);
    expect(mockPrisma.notification.findUnique).toHaveBeenCalledWith({ where: { id: eventId } });
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: eventId,
          type: 'EXPENSE_APPROVED',
          recipientId,
          workspaceId,
        }),
      })
    );
  });

  it('should be idempotent and ignore duplicate outbox events', async () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';

    mockPrisma.notification.findUnique.mockResolvedValue(null);
    mockPrisma.notification.create.mockImplementation(async ({ data }: Prisma.NotificationCreateArgs) => data);
    const request = {
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventId,
        eventType: 'expense.approved',
        payload: {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          workspaceId: '123e4567-e89b-12d3-a456-426614174002',
        },
      },
    } as const;
    await app.inject(request);
    mockPrisma.notification.findUnique.mockResolvedValue(mockPrisma.notification.create.mock.calls[0][0].data);
    mockPrisma.notification.create.mockClear();
    const response = await app.inject(request);

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(body.message).toContain('already processed');
    // Ensure duplicate did NOT create another database record
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('creates a high-priority notification for the bank connection owner when sync fails', async () => {
    const eventId = '123e4567-e89b-42d3-a456-426614174010';
    const recipientId = '123e4567-e89b-42d3-a456-426614174011';
    mockPrisma.notification.findUnique.mockResolvedValue(null);
    mockPrisma.notification.create.mockResolvedValue({ id: eventId });

    const response = await app.inject({
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventId,
        eventType: 'SyncSessionFailed',
        payload: {
          userId: recipientId,
          workspaceId: '123e4567-e89b-42d3-a456-426614174012',
          errorMessage: 'provider token rejected',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        recipientId,
        priority: 'HIGH',
        title: 'Bank sync failed',
        content: expect.not.stringContaining('provider token rejected'),
      }),
    }));
  });

  it('should reject invalid payload missing eventId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventType: 'expense.approved',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
  });
});
