import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { OutboxEventController } from '../controllers/outbox-event.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  eventParamsSchema,
  storeOutboxEventSchema,
  pendingEventsQuerySchema,
  failedEventsQuerySchema,
  cleanupEventsQuerySchema,
  workspaceParamsJsonSchema,
  eventParamsJsonSchema,
  storeOutboxEventBodyJsonSchema,
  pendingEventsQueryJsonSchema,
  failedEventsQueryJsonSchema,
  cleanupEventsQueryJsonSchema,
  outboxEventEnvelopeJsonSchema,
  paginatedOutboxEventEnvelopeJsonSchema,
  retryAllEnvelopeJsonSchema,
  deadLetterCountEnvelopeJsonSchema,
  baseResponseEnvelopeJsonSchema,
} from '../validation/outbox-event.schema';

export async function outboxEventRoutes(
  fastify: FastifyInstance,
  controller: OutboxEventController,
  prisma: PrismaClient,
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // ── GET routes ──────────────────────────────────────────────────────────────

  fastify.get(
    '/:workspaceId/event-outbox/events/pending',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(pendingEventsQuerySchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'List pending outbox events',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: pendingEventsQueryJsonSchema,
        response: {
          200: paginatedOutboxEventEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getPendingEvents(request as AuthenticatedRequest, reply),
  );

  fastify.get(
    '/:workspaceId/event-outbox/events/failed',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(failedEventsQuerySchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'List failed outbox events',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: failedEventsQueryJsonSchema,
        response: {
          200: paginatedOutboxEventEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getFailedEvents(request as AuthenticatedRequest, reply),
  );

  fastify.get(
    '/:workspaceId/event-outbox/events/dead-letter/count',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Get dead letter queue count',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: deadLetterCountEnvelopeJsonSchema,
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Retry all failed events within retry limit',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: retryAllEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.retryAllFailedEvents(request as AuthenticatedRequest, reply),
  );

  fastify.post(
    '/:workspaceId/event-outbox/events',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(storeOutboxEventSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Store a new outbox event',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: storeOutboxEventBodyJsonSchema,
        response: {
          201: outboxEventEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.storeEvent(request as AuthenticatedRequest, reply),
  );

  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/process',
    {
      preValidation: [validateParams(eventParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Manually process a specific outbox event',
        security: [{ bearerAuth: [] }],
        params: eventParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.processEvent(request as AuthenticatedRequest, reply),
  );

  fastify.post(
    '/:workspaceId/event-outbox/events/:eventId/retry',
    {
      preValidation: [validateParams(eventParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Reset a failed event to pending for retry',
        security: [{ bearerAuth: [] }],
        params: eventParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(cleanupEventsQuerySchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Event Outbox'],
        summary: 'Delete processed events older than retention period',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: cleanupEventsQueryJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) =>
      controller.cleanupProcessedEvents(request as AuthenticatedRequest, reply),
  );
}
