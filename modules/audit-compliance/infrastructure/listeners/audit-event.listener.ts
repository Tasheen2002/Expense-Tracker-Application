import {
  DomainEvent,
  DomainEventHandler,
} from "../../../../apps/api/src/shared/domain/events";
import { AuditService } from "../../application/services/audit.service";

/**
 * A universal listener for all domain events.
 */
export class AuditEventListener implements DomainEventHandler {
  constructor(private readonly auditService: AuditService) {}

  eventType = "audit.all";

  async handle(event: DomainEvent): Promise<void> {
    await this.auditService.log(event);
  }
}
