import { FastifyInstance } from "fastify";
import { OutboxEventController } from "./outbox-event.controller";

export async function registerOutboxEventRoutes(
  fastify: FastifyInstance,
  controller: OutboxEventController
) {
  // Store outbox event (typically used internally, not exposed publicly)
  fastify.post(
    "/outbox-events",
    {
      schema: {
        tags: ["Event Outbox"],
        body: {
          type: "object",
          required: ["aggregateType", "aggregateId", "eventType", "payload"],
          properties: {
            aggregateType: { type: "string" },
            aggregateId: { type: "string" },
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
    controller.storeEvent.bind(controller)
  );

  // Get pending events (admin/monitoring endpoint)
  fastify.get(
    "/outbox-events/pending",
    {
      schema: {
        tags: ["Event Outbox"],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              events: { type: "array" },
              count: { type: "number" },
            },
          },
        },
      },
    },
    controller.getPendingEvents.bind(controller)
  );

  // Get failed events (admin/monitoring endpoint)
  fastify.get(
    "/outbox-events/failed",
    {
      schema: {
        tags: ["Event Outbox"],
        querystring: {
          type: "object",
          properties: {
            maxRetries: { type: "string" },
            limit: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              events: { type: "array" },
              count: { type: "number" },
            },
          },
        },
      },
    },
    controller.getFailedEvents.bind(controller)
  );
}
