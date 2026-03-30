import { FastifyInstance } from 'fastify';
import { OutboxEventController } from '../controllers/outbox-event.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

export async function outboxEventRoutes(
  fastify: FastifyInstance,
  controller: OutboxEventController
) {
  // Store outbox event (internal use — inject a raw event into the outbox)
  fastify.post(
    '/:workspaceId/event-outbox/events',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['aggregateType', 'aggregateId', 'eventType', 'payload'],
          properties: {
            aggregateType: { type: 'string' },
            aggregateId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string' },
            payload: { type: 'object' },
          },
        },
      },
    },
    (request, reply) =>
      controller.storeEvent(request as AuthenticatedRequest, reply)
  );

  // Process a specific pending/failed event (admin operation)
  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/process',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId', 'eventId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            eventId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) =>
      controller.processEvent(request as AuthenticatedRequest, reply)
  );

  // Retry a specific failed event (reset to PENDING)
  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/retry',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId', 'eventId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            eventId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) =>
      controller.retryEvent(request as AuthenticatedRequest, reply)
  );

  // Retry all failed events that haven't exhausted max retries
  fastify.post(
    '/:workspaceId/event-outbox/events/retry-all',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) =>
      controller.retryAllFailedEvents(request as AuthenticatedRequest, reply)
  );

  // Cleanup processed events older than retentionDays
  fastify.delete(
    '/:workspaceId/event-outbox/events/processed',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            retentionDays: { type: 'string' },
          },
        },
      },
    },
    (request, reply) =>
      controller.cleanupProcessedEvents(request as AuthenticatedRequest, reply)
  );

  // Get pending events (monitoring)
  fastify.get(
    '/:workspaceId/event-outbox/events/pending',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
      },
    },
    (request, reply) =>
      controller.getPendingEvents(request as AuthenticatedRequest, reply)
  );

  // Get failed events (monitoring)
  fastify.get(
    '/:workspaceId/event-outbox/events/failed',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            maxRetries: { type: 'string' },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
      },
    },
    (request, reply) =>
      controller.getFailedEvents(request as AuthenticatedRequest, reply)
  );

  // Get dead letter queue count (events that exceeded max retries)
  fastify.get(
    '/:workspaceId/event-outbox/events/dead-letter/count',
    {
      schema: {
        tags: ['Event Outbox'],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) =>
      controller.getDeadLetterCount(request as AuthenticatedRequest, reply)
  );
}
