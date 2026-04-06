export { registerAuditComplianceRoutes } from './infrastructure/http/routes';
export { AuditService } from './application/services/audit.service';
export type { CreateAuditLogDTO } from './application/services/audit.service';
export { AuditEventListener } from './infrastructure/listeners/audit-event.listener';

// Domain error types (used by cross-cutting error handlers)
export {
  InvalidAuditActionError,
  InvalidAuditResourceError,
  AuditLogNotFoundError,
  UnauthorizedAuditAccessError,
  InvalidAuditDateRangeError,
  AuditRetentionViolationError,
  InvalidAuditFilterError,
  AuditLogImmutableError,
  AuditLogExportLimitExceededError,
} from './domain/errors/audit.errors';

// Domain enums (safe to share — value objects, not entities)
export {
  AuditActionType,
  AuditEntityType,
} from './domain/enums/audit-action-type.enum';
