import Fastify from 'fastify';
import { HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { describe, expect, it, vi } from 'vitest';
import { registerAuditOutboxEventRoutes } from '../../../../../audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/outbox-event.routes';
import { AuditService } from '../../../../../audit-compliance-service/src/modules/audit-compliance/application/services/audit.service';
import { buildWebhookRoutes } from '../../../shared/infrastructure/webhooks/webhook-routing';
import { ExpenseSubmittedEvent } from '../domain/entities/expense.entity';

describe('expense to audit webhook contract', () => {
  it.each(['BudgetPlanCreated', 'BudgetPlanUpdated', 'BudgetPlanStatusChanged'])('delivers historical %s with its original identity and workspace', async (eventType) => {
    const eventId = '123e4567-e89b-42d3-a456-426614174010';
    const planId = '123e4567-e89b-42d3-a456-426614174011';
    const workspaceId = '123e4567-e89b-42d3-a456-426614174012';
    const recordExternalEvent = vi.fn().mockResolvedValue({ auditLogId: eventId, duplicate: false });
    const app = Fastify({ logger: false });
    try {
      await app.register(instance => registerAuditOutboxEventRoutes(instance,
        { recordExternalEvent } as unknown as AuditService), { prefix: '/api/v1' });
      await app.listen({ host: '127.0.0.1', port: 0 });
      const address = app.server.address();
      if (!address || typeof address === 'string') throw new Error('Audit test server did not bind');
      const publisher = new HttpWebhookPublisher(buildWebhookRoutes({
        auditServiceUrl: `http://127.0.0.1:${address.port}`, notificationServiceUrl: 'http://127.0.0.1:1' }));
      const payload = { planId, workspaceId, name: 'Historical plan', oldStatus: 'DRAFT', newStatus: 'ACTIVE' };
      await publisher.publish({ id: eventId, aggregateId: planId, aggregateType: 'BudgetPlan', eventType,
        payload, status: 'PROCESSING', createdAt: '2026-09-24T13:14:06.319Z', processedAt: null,
        retryCount: 0, error: null });
      expect(recordExternalEvent).toHaveBeenCalledOnce();
      expect(recordExternalEvent).toHaveBeenCalledWith(expect.objectContaining({ eventId, eventType,
        aggregateId: planId, payload: expect.objectContaining({ planId, workspaceId }) }));
    } finally { await app.close(); }
  });
  it('persists the submitting actor and workspace from a real expense event, including duplicate delivery', async () => {
    const expenseId = '123e4567-e89b-12d3-a456-426614174002';
    const workspaceId = '123e4567-e89b-12d3-a456-426614174001';
    const submittedBy = '123e4567-e89b-12d3-a456-426614174003';
    const event = new ExpenseSubmittedEvent(expenseId, workspaceId, submittedBy, 25, 'USD');
    const recordExternalEvent = vi.fn()
      .mockResolvedValueOnce({ auditLogId: event.eventId, duplicate: false })
      .mockResolvedValueOnce({ auditLogId: event.eventId, duplicate: true });
    const auditService = { recordExternalEvent } as unknown as AuditService;
    const app = Fastify({ logger: false });

    try {
      await app.register(
        async (instance) => registerAuditOutboxEventRoutes(instance, auditService),
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

      expect(recordExternalEvent).toHaveBeenCalledTimes(2);
      expect(recordExternalEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: expenseId,
        payload: expect.objectContaining({ workspaceId, submittedBy }),
      }));
    } finally {
      await app.close();
    }
  });
});
