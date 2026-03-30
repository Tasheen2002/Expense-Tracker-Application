import { DomainError } from "../../../../apps/api/src/shared/domain/domain-error";

export class InvalidAuditActionError extends DomainError {
  constructor(action: string) {
    super(
      `Action cannot be empty and must be less than 100 characters. Received: ${action}`,
    );
  }
}

export class InvalidAuditResourceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class AuditLogNotFoundError extends DomainError {
  constructor(auditLogId: string) {
    super(`Audit log with ID '${auditLogId}' was not found.`);
  }
}

export class UnauthorizedAuditAccessError extends DomainError {
  constructor(userId: string, workspaceId: string) {
    super(
      `User '${userId}' is not authorized to access audit logs in workspace '${workspaceId}'.`,
    );
  }
}

export class InvalidAuditDateRangeError extends DomainError {
  constructor(startDate: Date, endDate: Date) {
    super(
      `Invalid date range: start date '${startDate.toISOString()}' must be before end date '${endDate.toISOString()}'.`,
    );
  }
}

export class AuditRetentionViolationError extends DomainError {
  constructor(retentionDays: number, requestedDays: number) {
    super(
      `Cannot access audit logs older than ${retentionDays} days. Requested data is ${requestedDays} days old.`,
    );
  }
}

export class InvalidAuditFilterError extends DomainError {
  constructor(filterName: string, reason: string) {
    super(`Invalid audit filter '${filterName}': ${reason}`);
  }
}

export class AuditLogImmutableError extends DomainError {
  constructor(auditLogId: string) {
    super(
      `Audit log '${auditLogId}' cannot be modified. Audit logs are immutable.`,
    );
  }
}

export class AuditLogExportLimitExceededError extends DomainError {
  constructor(requestedCount: number, maxLimit: number) {
    super(
      `Cannot export ${requestedCount} audit logs. Maximum export limit is ${maxLimit}.`,
    );
  }
}
