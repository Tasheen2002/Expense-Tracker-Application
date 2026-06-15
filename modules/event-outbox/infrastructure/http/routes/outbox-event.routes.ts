import { FastifyInstance } from 'fastify';
import { OutboxEventController } from '../controllers/outbox-event.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { authenticate } from '@shared/middleware/authenticate.middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { successResponse, noContentResponse } from '@shared/http/response-schemas';
import {
  workspaceParamsJson,
  eventParamsJson,
  storeOutboxEventBodyJson,
  pendingEventsQueryJson,
  failedEventsQueryJson,
  cleanupEventsQueryJson,
  outboxEventResponseSchema,
  paginatedOutboxEventResponseSchema,
  retryAllResponseSchema,
  deadLetterCountResponseSchema,
} from '../validation/outbox-event.schema';

export async function outboxEventRoutes(
  fastify: FastifyInstance,
  controller: OutboxEventController,
): Promise<void> {
  // ── GET routes ──────────────────────────────────────────────────────────────

  fastify.get(
    '/:workspaceId/event-outbox/events/pending',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'List pending outbox events',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJson,
        querystring: pendingEventsQueryJson,
        response: {
          200: successResponse(paginatedOutboxEventResponseSchema),
        },
      },
    },
    (request, reply) =>
      controller.getPendingEvents(request as AuthenticatedRequest, reply),
  );

  fastify.get(
    '/:workspaceId/event-outbox/events/failed',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'List failed outbox events',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJson,
        querystring: failedEventsQueryJson,
        response: {
          200: successResponse(paginatedOutboxEventResponseSchema),
        },
      },
    },
    (request, reply) =>
      controller.getFailedEvents(request as AuthenticatedRequest, reply),
  );

  fastify.get(
    '/:workspaceId/event-outbox/events/dead-letter/count',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Get dead letter queue count',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJson,
        response: {
          200: successResponse(deadLetterCountResponseSchema),
        },
      },
    },
    (request, reply) =>
      controller.getDeadLetterCount(request as AuthenticatedRequest, reply),
  );

  // ── POST routes (specific before parametric) ────────────────────────────────

  fastify.post(
    '/:workspaceId/event-outbox/events/retry-all',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Retry all failed events within retry limit',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJson,
        response: {
          200: successResponse(retryAllResponseSchema),
        },
      },
    },
    (request, reply) =>
      controller.retryAllFailedEvents(request as AuthenticatedRequest, reply),
  );

  fastify.post(
    '/:workspaceId/event-outbox/events',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Store a new outbox event',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJson,
        body: storeOutboxEventBodyJson,
        response: {
          201: successResponse(outboxEventResponseSchema, 201),
        },
      },
    },
    (request, reply) =>
      controller.storeEvent(request as AuthenticatedRequest, reply),
  );

  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/process',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Manually process a specific outbox event',
        security: [{ bearerAuth: [] }],
        params: eventParamsJson,
        response: {
          200: successResponse({ type: 'null' as const }),
        },
      },
    },
    (request, reply) =>
      controller.processEvent(request as AuthenticatedRequest, reply),
  );

  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/retry',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Reset a failed event to pending for retry',
        security: [{ bearerAuth: [] }],
        params: eventParamsJson,
        response: {
          200: successResponse({ type: 'null' as const }),
        },
      },
    },
    (request, reply) =>
      controller.retryEvent(request as AuthenticatedRequest, reply),
  );

  // ── DELETE routes ────────────────────────────────────────────────────────────

  fastify.delete(
    '/:workspaceId/event-outbox/events/processed',
    {
      preHandler: [authenticate, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Delete processed events older than retention period',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJson,
        querystring: cleanupEventsQueryJson,
        response: {
          204: noContentResponse,
        },
      },
    },
    (request, reply) =>
      controller.cleanupProcessedEvents(request as AuthenticatedRequest, reply),
  );
}
