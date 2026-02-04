// Domain Layer Exports
export {
  AuditLog,
  AuditLogCreatedEvent,
  AuditLogsQueriedEvent,
  AuditRetentionAppliedEvent,
} from "./domain/entities/audit-log.entity";
export { AuditLogId } from "./domain/value-objects/audit-log-id.vo";
export { AuditAction } from "./domain/value-objects/audit-action.vo";
export { AuditResource } from "./domain/value-objects/audit-resource.vo";
export {
  AuditLogRepository,
  AuditLogFilter,
} from "./domain/repositories/audit-log.repository";
export { AuditActionType, AuditEntityType } from "./domain/enums";
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
} from "./domain/errors/audit.errors";

// Application Layer Exports
export {
  AuditService,
  CreateAuditLogDTO,
  AuditSummary,
  ListAuditLogsFilters,
} from "./application/services";
export {
  CreateAuditLogCommand,
  CreateAuditLogHandler,
} from "./application/commands";
export {
  GetAuditLogQuery,
  GetAuditLogHandler,
  ListAuditLogsQuery,
  ListAuditLogsHandler,
  GetEntityAuditHistoryQuery,
  GetEntityAuditHistoryHandler,
  GetAuditSummaryQuery,
  GetAuditSummaryHandler,
} from "./application/queries";

// Infrastructure Layer Exports
export { AuditLogRepositoryImpl } from "./infrastructure/persistence/audit-log.repository.impl";
export {
  registerAuditComplianceRoutes,
  auditLogRoutes,
} from "./infrastructure/http/routes";
export { AuditLogController } from "./infrastructure/http/controllers";
