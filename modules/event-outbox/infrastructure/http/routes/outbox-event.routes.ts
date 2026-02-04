import { FastifyInstance } from "fastify";
import { OutboxEventController } from "../controllers/outbox-event.controller";

export async function outboxEventRoutes(
  fastify: FastifyInstance,
  controller: OutboxEventController,
) {
  // Store outbox event (typically used internally, not exposed publicly)
  fastify.post(
    "/:workspaceId/event-outbox/events",
    {
      schema: {
        tags: ["Event Outbox"],
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["aggregateType", "aggregateId", "eventType", "payload"],
          properties: {
            aggregateType: { type: "string" },
            aggregateId: { type: "string", format: "uuid" },
            eventType: { type: "string" },
            payload: { type: "object" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              eventId: { type: "string" },
            },
          },
        },
      },
    },
    (request, reply) => controller.storeEvent(request as any, reply),
  );

  // Get pending events (admin/monitoring endpoint)
  fastify.get(
    "/:workspaceId/event-outbox/events/pending",
    {
      schema: {
        tags: ["Event Outbox"],
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  items: { type: "array", items: { type: "object" } },
                  pagination: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      limit: { type: "number" },
                      offset: { type: "number" },
                      hasMore: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getPendingEvents(request as any, reply),
  );

  // Get failed events (admin/monitoring endpoint)
  fastify.get(
    "/:workspaceId/event-outbox/events/failed",
    {
      schema: {
        tags: ["Event Outbox"],
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            maxRetries: { type: "string" },
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  items: { type: "array", items: { type: "object" } },
                  pagination: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      limit: { type: "number" },
                      offset: { type: "number" },
                      hasMore: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getFailedEvents(request as any, reply),
  );
}
