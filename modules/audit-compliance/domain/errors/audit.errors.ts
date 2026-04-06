import { DomainError } from '../../../../packages/core/src/domain/domain-error';

export class InvalidAuditActionError extends DomainError {
  constructor(action: string) {
    super(
      `Action cannot be empty and must be less than 100 characters. Received: ${action}`,
      'INVALID_AUDIT_ACTION',
      400
    );
  }
}

export class InvalidAuditResourceError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_AUDIT_RESOURCE', 400);
  }
}

export class AuditLogNotFoundError extends DomainError {
  constructor(auditLogId: string) {
    super(
      `Audit log with ID '${auditLogId}' was not found.`,
      'AUDIT_LOG_NOT_FOUND',
      404
    );
  }
}

export class UnauthorizedAuditAccessError extends DomainError {
  constructor(userId: string, workspaceId: string) {
    super(
      `User '${userId}' is not authorized to access audit logs in workspace '${workspaceId}'.`,
      'UNAUTHORIZED_AUDIT_ACCESS',
      403
    );
  }
}

export class InvalidAuditDateRangeError extends DomainError {
  constructor(startDate: Date, endDate: Date) {
    super(
      `Invalid date range: start date '${startDate.toISOString()}' must be before end date '${endDate.toISOString()}'.`,
      'INVALID_AUDIT_DATE_RANGE',
      400
    );
  }
}

export class AuditRetentionViolationError extends DomainError {
  constructor(retentionDays: number, requestedDays: number) {
    super(
      `Cannot access audit logs older than ${retentionDays} days. Requested data is ${requestedDays} days old.`,
      'AUDIT_RETENTION_VIOLATION',
      403
    );
  }
}

export class InvalidAuditFilterError extends DomainError {
  constructor(filterName: string, reason: string) {
    super(
      `Invalid audit filter '${filterName}': ${reason}`,
      'INVALID_AUDIT_FILTER',
      400
    );
  }
}

export class AuditLogImmutableError extends DomainError {
  constructor(auditLogId: string) {
    super(
      `Audit log '${auditLogId}' cannot be modified. Audit logs are immutable.`,
      'AUDIT_LOG_IMMUTABLE',
      409
    );
  }
}

export class AuditLogExportLimitExceededError extends DomainError {
  constructor(requestedCount: number, maxLimit: number) {
    super(
      `Cannot export ${requestedCount} audit logs. Maximum export limit is ${maxLimit}.`,
      'AUDIT_LOG_EXPORT_LIMIT_EXCEEDED',
      400
    );
  }
}
