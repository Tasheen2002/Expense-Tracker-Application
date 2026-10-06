import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuditService } from '../../../application/services/audit.service';
import { AuditEventConflictError } from '../../../domain/errors/audit.errors';
import { AccountAuditService } from '../../../application/services/account-audit.service';
import { accountEventOwner } from '../../../../../../../../packages/contracts/src/account-events';

const uuidSchema = z.string().uuid();
const actorFields = [
  'submittedBy', 'approvedBy', 'rejectedBy', 'changedBy', 'createdBy',
  'updatedBy', 'deletedBy', 'triggeredBy', 'recordedBy', 'requestedBy', 'userId',
] as const;

const OutboxEventPayloadSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string().trim().min(1).max(100),
  aggregateId: z.string().optional(),
  aggregateType: z.string().trim().min(1).max(100).optional(),
  payload: z.record(z.any()).optional().default({}),
  timestamp: z.string().datetime({ offset: true }).refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Invalid event timestamp',
  ).optional(),
});

export type OutboxEventPayload = z.infer<typeof OutboxEventPayloadSchema>;

export async function registerAuditOutboxEventRoutes(
  fastify: FastifyInstance,
  auditService: AuditService,
  accountAuditService?: AccountAuditService,
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

      let accountId: string | null;
      try { accountId = accountEventOwner(parseResult.data); }
      catch { return reply.code(400).send({ success: false, error: 'Invalid account event scope' }); }
      if (accountId) {
        if (!accountAuditService) return reply.code(503).send({ success: false, error: 'Account auditing unavailable' });
        try {
          const result = await accountAuditService.record(parseResult.data);
          return reply.code(result.duplicate ? 200 : 201).send({ success: true, ...result });
        } catch (err: unknown) {
          if (err instanceof AuditEventConflictError) return reply.code(409).send({ success: false, error: 'Event ID conflict' });
          request.log.error({ err }, 'Account auditing failed');
          return reply.code(500).send({ success: false, error: 'Failed to record account audit log' });
        }
      }

      const workspaceCandidate = payload.workspaceId === undefined && aggregateType?.toLowerCase() === 'workspace'
        ? aggregateId
        : payload.workspaceId;
      const workspaceResult = uuidSchema.safeParse(workspaceCandidate);
      if (!workspaceResult.success) {
        return reply.code(400).send({ success: false, error: 'Valid workspaceId is required' });
      }

      const actorField = actorFields.find((field) => payload[field] !== undefined && payload[field] !== null);
      const actorResult = actorField ? uuidSchema.safeParse(payload[actorField]) : null;
      if (actorResult && !actorResult.success) {
        return reply.code(400).send({ success: false, error: `Invalid ${actorField}` });
      }
      try {
        const result = await auditService.recordExternalEvent({
          eventId, eventType, aggregateId, aggregateType, payload,
          occurredAt: timestamp ? new Date(timestamp) : undefined,
        });
        if (result.duplicate) {
          request.log.info({ eventId, eventType }, 'Outbox event already processed (idempotent ignore)');
          return reply.code(200).send({
            success: true,
            duplicate: true,
            message: 'Event already processed',
            auditLogId: result.auditLogId,
          });
        }
        request.log.info({ eventId, eventType, auditLogId: result.auditLogId }, 'Outbox event successfully audited');
        return reply.code(201).send({
          success: true,
          auditLogId: result.auditLogId,
        });
      } catch (err: unknown) {
        if (err instanceof AuditEventConflictError) {
          request.log.warn({ eventId, eventType }, 'Conflicting outbox event ID');
          return reply.code(409).send({ success: false, error: 'Event ID conflict' });
        }
        request.log.error({ err }, 'Failed to process outbox event for auditing');
        return reply.code(500).send({
          success: false,
          error: 'Failed to record audit log',
          message: 'An unexpected error occurred',
        });
      }
    }
  );
}
