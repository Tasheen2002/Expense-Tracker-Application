export { registerAuditComplianceRoutes } from './infrastructure/http/routes';
export type { CreateAuditLogDTO } from './application/services/audit.service';
export type { AuditLogDTO } from './domain/entities/audit-log.entity';

// Domain error types (used by cross-cutting error handlers)
export {
  InvalidAuditActionError,
  InvalidAuditResourceError,
  InvalidAuditIdentityError,
  AuditEventConflictError,
  AuditLogNotFoundError,
  UnauthorizedAuditAccessError,
  InvalidAuditDateRangeError,
  AuditRetentionViolationError,
  InvalidAuditFilterError,
  AuditLogImmutableError,
  AuditLogExportLimitExceededError,
} from './domain/errors/audit.errors';
