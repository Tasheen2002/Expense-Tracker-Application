import {
  DomainEvent,
  DomainEventHandler,
} from '../../../../apps/api/src/shared/domain/events';
import { CreateAuditLogHandler } from '../../application/commands/create-audit-log.command';


export class AuditEventListener implements DomainEventHandler {
  constructor(private readonly createAuditLogHandler: CreateAuditLogHandler) {}

  readonly eventType = 'audit.universal';

  async handle(event: DomainEvent): Promise<void> {
    // Prevent infinite recursion by ignoring audit-related events
    if (event.aggregateType === 'AuditLog') {
      return;
    }

    const payload = event.getPayload();
    const workspaceId = payload.workspaceId;

    if (!workspaceId) {
      console.debug(
        `[AuditEventListener] Skipping system-level event without workspaceId: ${event.eventType}`
      );
      return;
    }

    const userId = payload.triggeredBy || payload.userId || null;

    const result = await this.createAuditLogHandler.handle({
      data: {
        workspaceId: String(workspaceId),
        userId: userId ? String(userId) : null,
        action: event.eventType,
        entityType: event.aggregateType,
        entityId: event.aggregateId,
        details: payload,
        metadata: {
          timestamp: event.occurredAt,
          eventId: event.eventId,
        },
        ipAddress: undefined,
        userAgent: undefined,
      },
    });

    if (!result.success) {
      console.error(
        `[AuditEventListener] Failed to create audit log for event "${event.eventType}": ${result.error}`
      );
    }
  }
}
