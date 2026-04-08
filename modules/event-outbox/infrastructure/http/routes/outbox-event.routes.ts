import { FastifyInstance } from 'fastify';
import { OutboxEventController } from '../controllers/outbox-event.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { requireRole } from '@shared/middleware/role-authorization.middleware';

const workspaceParamsSchema = {
  type: 'object' as const,
  required: ['workspaceId'],
  properties: {
    workspaceId: { type: 'string' as const, format: 'uuid' },
  },
};

const eventParamsSchema = {
  type: 'object' as const,
  required: ['workspaceId', 'eventId'],
  properties: {
    workspaceId: { type: 'string' as const, format: 'uuid' },
    eventId: { type: 'string' as const, format: 'uuid' },
  },
};

const outboxEventSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    aggregateType: { type: 'string' as const },
    aggregateId: { type: 'string' as const },
    eventType: { type: 'string' as const },
    payload: { type: 'object' as const },
    status: { type: 'string' as const },
    createdAt: { type: 'string' as const, format: 'date-time' },
    processedAt: { type: 'string' as const, format: 'date-time', nullable: true },
    retryCount: { type: 'number' as const },
    error: { type: 'string' as const, nullable: true },
  },
};

const successResponse = (statusCode: number, dataSchema: object, description: string) => ({
  [statusCode]: {
    description,
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' as const },
      statusCode: { type: 'number' as const },
      message: { type: 'string' as const },
      data: dataSchema,
    },
  },
});

const paginatedEventsSchema = {
  type: 'object' as const,
  properties: {
    items: { type: 'array' as const, items: outboxEventSchema },
    pagination: {
      type: 'object' as const,
      properties: {
        total: { type: 'number' as const },
        limit: { type: 'number' as const },
        offset: { type: 'number' as const },
        hasMore: { type: 'boolean' as const },
      },
    },
  },
};

export async function outboxEventRoutes(
  fastify: FastifyInstance,
  controller: OutboxEventController
) {
  // Store outbox event (admin only)
  fastify.post(
    '/:workspaceId/event-outbox/events',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Store a new outbox event',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsSchema,
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
        response: successResponse(201, outboxEventSchema, 'Outbox event stored successfully'),
      },
    },
    (request, reply) =>
      controller.storeEvent(request as AuthenticatedRequest, reply)
  );

  // Process a specific pending/failed event (admin only)
  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/process',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Process a specific outbox event',
        security: [{ bearerAuth: [] }],
        params: eventParamsSchema,
        response: successResponse(200, { type: 'null' as const }, 'Outbox event processed successfully'),
      },
    },
    (request, reply) =>
      controller.processEvent(request as AuthenticatedRequest, reply)
  );

  // Retry a specific failed event (admin only)
  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/retry',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Retry a specific failed event',
        security: [{ bearerAuth: [] }],
        params: eventParamsSchema,
        response: successResponse(200, { type: 'null' as const }, 'Outbox event queued for retry'),
      },
    },
    (request, reply) =>
      controller.retryEvent(request as AuthenticatedRequest, reply)
  );

  // Retry all failed events (admin only)
  fastify.post(
    '/:workspaceId/event-outbox/events/retry-all',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Retry all failed events that have not exhausted max retries',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsSchema,
        response: successResponse(200, {
          type: 'object' as const,
          properties: {
            retried: { type: 'number' as const },
            deadLettered: { type: 'number' as const },
          },
        }, 'Failed events queued for retry'),
      },
    },
    (request, reply) =>
      controller.retryAllFailedEvents(request as AuthenticatedRequest, reply)
  );

  // Cleanup processed events (admin only)
  fastify.delete(
    '/:workspaceId/event-outbox/events/processed',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Cleanup processed events older than retention days',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsSchema,
        querystring: {
          type: 'object',
          properties: {
            retentionDays: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          204: { type: 'null', description: 'No Content' },
        },
      },
    },
    (request, reply) =>
      controller.cleanupProcessedEvents(request as AuthenticatedRequest, reply)
  );

  // Get pending events (admin monitoring)
  fastify.get(
    '/:workspaceId/event-outbox/events/pending',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Get pending outbox events',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsSchema,
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string', pattern: '^[0-9]+$' },
            offset: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: successResponse(200, paginatedEventsSchema, 'Pending events retrieved successfully'),
      },
    },
    (request, reply) =>
      controller.getPendingEvents(request as AuthenticatedRequest, reply)
  );

  // Get failed events (admin monitoring)
  fastify.get(
    '/:workspaceId/event-outbox/events/failed',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Get failed outbox events',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsSchema,
        querystring: {
          type: 'object',
          properties: {
            maxRetries: { type: 'string', pattern: '^[0-9]+$' },
            limit: { type: 'string', pattern: '^[0-9]+$' },
            offset: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: successResponse(200, paginatedEventsSchema, 'Failed events retrieved successfully'),
      },
    },
    (request, reply) =>
      controller.getFailedEvents(request as AuthenticatedRequest, reply)
  );

  // Get dead letter queue count (admin monitoring)
  fastify.get(
    '/:workspaceId/event-outbox/events/dead-letter/count',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Event Outbox'],
        description: 'Get dead letter queue count',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsSchema,
        response: successResponse(200, {
          type: 'object' as const,
          properties: { count: { type: 'number' as const } },
        }, 'Dead letter count retrieved successfully'),
      },
    },
    (request, reply) =>
      controller.getDeadLetterCount(request as AuthenticatedRequest, reply)
  );
}
