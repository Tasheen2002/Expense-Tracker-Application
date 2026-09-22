import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const OutboxEventPayloadSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  aggregateId: z.string().optional(),
  aggregateType: z.string().optional(),
  payload: z.record(z.any()).optional().default({}),
  timestamp: z.string().optional(),
});

export type OutboxEventPayload = z.infer<typeof OutboxEventPayloadSchema>;

export async function registerAuditOutboxEventRoutes(
  fastify: FastifyInstance,
  prisma: any
) {
  fastify.post(
    '/event-outbox/events',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = OutboxEventPayloadSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const { eventId, eventType, aggregateId, aggregateType, payload, timestamp } =
        parseResult.data;

      // 1. Idempotency Check: Skip duplicate events
      const existing = await prisma.auditLog.findUnique({
        where: { id: eventId },
      });

      if (existing) {
        request.log.info({ eventId, eventType }, 'Outbox event already processed (idempotent ignore)');
        return reply.code(200).send({
          success: true,
          duplicate: true,
          message: 'Event already processed',
          auditLogId: existing.id,
        });
      }

      // 2. Extract context attributes safely from payload
      const workspaceId =
        payload?.workspaceId ||
        (aggregateType?.toLowerCase() === 'workspace' ? aggregateId : null) ||
        '00000000-0000-0000-0000-000000000000';

      const userId = payload?.userId || payload?.approvedBy || payload?.rejectedBy || null;

      // Ensure entityId is a valid UUID
      const entityIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const entityId = aggregateId && entityIdRegex.test(aggregateId) ? aggregateId : eventId;

      try {
        const auditLog = await prisma.auditLog.create({
          data: {
            id: eventId,
            workspaceId: entityIdRegex.test(workspaceId)
              ? workspaceId
              : '00000000-0000-0000-0000-000000000000',
            userId: userId && entityIdRegex.test(userId) ? userId : null,
            action: eventType,
            entityType: aggregateType || 'OutboxEvent',
            entityId,
            details: payload as any,
            metadata: {
              source: 'outbox-webhook',
              receivedAt: new Date().toISOString(),
            },
            createdAt: timestamp ? new Date(timestamp) : new Date(),
          },
        });

        request.log.info({ eventId, eventType, auditLogId: auditLog.id }, 'Outbox event successfully audited');
        return reply.code(201).send({
          success: true,
          auditLogId: auditLog.id,
        });
      } catch (err: any) {
        // Handle concurrent race condition for the same eventId
        if (err.code === 'P2002') {
          return reply.code(200).send({
            success: true,
            duplicate: true,
            message: 'Event already processed concurrently',
          });
        }
        request.log.error(err, 'Failed to process outbox event for auditing');
        return reply.code(500).send({
          success: false,
          error: 'Failed to record audit log',
          message: err.message,
        });
      }
    }
  );
}
