import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { describe, expect, it, vi } from 'vitest';
import { registerAuditOutboxEventRoutes } from '../../../../../audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/outbox-event.routes';
import { buildWebhookRoutes } from '../../../shared/infrastructure/webhooks/webhook-routing';
import { ExpenseSubmittedEvent } from '../domain/entities/expense.entity';

describe('expense to audit webhook contract', () => {
  it('persists the submitting actor and workspace from a real expense event, including duplicate delivery', async () => {
    const expenseId = '123e4567-e89b-12d3-a456-426614174002';
    const workspaceId = '123e4567-e89b-12d3-a456-426614174001';
    const submittedBy = '123e4567-e89b-12d3-a456-426614174003';
    const event = new ExpenseSubmittedEvent(expenseId, workspaceId, submittedBy, 25, 'USD');
    const findUnique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: event.eventId });
    const create = vi.fn().mockImplementation(async ({ data }) => ({ id: data.id }));
    const auditPrisma = { auditLog: { findUnique, create } } as unknown as PrismaClient;
    const app = Fastify({ logger: false });

    try {
      await app.register(
        async (instance) => registerAuditOutboxEventRoutes(instance, auditPrisma),
        { prefix: '/api/v1' },
      );
      await app.listen({ host: '127.0.0.1', port: 0 });
      const address = app.server.address();
      if (!address || typeof address === 'string') throw new Error('Audit test server did not bind a port');
      const auditServiceUrl = `http://127.0.0.1:${address.port}`;
      const publisher = new HttpWebhookPublisher(buildWebhookRoutes({
        auditServiceUrl,
        notificationServiceUrl: 'http://127.0.0.1:1',
      }));
      const outboxEvent = {
        id: event.eventId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        payload: event.getPayload(),
        status: 'PROCESSING' as const,
        createdAt: event.occurredAt.toISOString(),
        processedAt: null,
        retryCount: 0,
        error: null,
      };

      await publisher.publish(outboxEvent);
      await publisher.publish(outboxEvent);

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: event.eventId,
          workspaceId,
          userId: submittedBy,
          action: event.eventType,
          entityId: expenseId,
        }),
      });
    } finally {
      await app.close();
    }
  });
});
