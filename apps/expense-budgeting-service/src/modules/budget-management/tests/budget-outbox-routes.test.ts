import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { budgetWebhookRoutes } from '../infrastructure/outbox/budget-webhook-routes';
import Fastify from 'fastify';
import { HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { randomUUID } from 'node:crypto';

describe('budget outbox routing', () => {
  it('assigns a subscriber to every budget-management domain event', () => {
    const routes = budgetWebhookRoutes('http://audit', 'http://notification');
    const source = ['budget.entity.ts', 'spending-limit.entity.ts']
      .map((file) => readFileSync(resolve(__dirname, '../domain/entities', file), 'utf8'))
      .join('\n');
    const emittedTypes = [...source.matchAll(/return '(budget|spending-limit)\.[^']+';/g)]
      .map((match) => match[0].slice(8, -2));

    expect(emittedTypes.length).toBeGreaterThan(0);
    for (const eventType of emittedTypes) {
      expect(routes[eventType], eventType).toBeDefined();
      expect(routes[eventType].length, eventType).toBeGreaterThan(0);
    }
    expect(routes['budget.threshold_exceeded']).toContain(
      'http://notification/api/v1/event-outbox/events'
    );
  });

  it('delivers a threshold event to audit and notification HTTP receivers', async () => {
    const audit = Fastify();
    const notification = Fastify();
    const received: Array<{ receiver: string; eventType: string }> = [];
    audit.post('/api/v1/event-outbox/events', async (request) => {
      received.push({ receiver: 'audit', eventType: (request.body as { eventType: string }).eventType });
      return { accepted: true };
    });
    notification.post('/api/v1/event-outbox/events', async (request) => {
      received.push({ receiver: 'notification', eventType: (request.body as { eventType: string }).eventType });
      return { accepted: true };
    });
    try {
      const auditUrl = await audit.listen({ host: '127.0.0.1', port: 0 });
      const notificationUrl = await notification.listen({ host: '127.0.0.1', port: 0 });
      const publisher = new HttpWebhookPublisher(budgetWebhookRoutes(auditUrl, notificationUrl));
      const delivered: string[] = [];
      await publisher.publish({
        id: randomUUID(), aggregateType: 'Budget', aggregateId: randomUUID(),
        eventType: 'budget.threshold_exceeded', payload: { threshold: 100 },
        status: 'PROCESSING', createdAt: new Date().toISOString(),
        processedAt: null, retryCount: 0, error: null,
      }, async (url) => { delivered.push(url); });
      expect(received).toHaveLength(2);
      expect(received.map((item) => item.receiver).sort()).toEqual(['audit', 'notification']);
      expect(received.every((item) => item.eventType === 'budget.threshold_exceeded')).toBe(true);
      expect(delivered).toHaveLength(2);
    } finally {
      await Promise.all([audit.close(), notification.close()]);
    }
  });
});
