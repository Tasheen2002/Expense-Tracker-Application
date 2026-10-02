import { PureDomainError } from './pure-domain-error';

/**
 * Centralized mapping of transport-neutral domain error codes to HTTP status codes.
 *
 * Keeps domain errors 100% pure (no HTTP statusCode inside domain entities or services)
 * while ensuring consistent HTTP status codes at the API boundary.
 */
export function mapDomainCodeToHttpStatus(code?: string): number {
  if (!code) return 500;

  switch (code) {
    // 503 Service Unavailable
    case 'DOWNSTREAM_SERVICE_UNAVAILABLE':
    case 'SERVICE_UNAVAILABLE':
      return 503;

    // 502 Bad Gateway
    case 'DOWNSTREAM_SERVICE_ERROR':
    case 'BAD_GATEWAY':
    case 'EXPENSE_SNAPSHOT_MISMATCH':
      return 502;

    // 500 Internal Server Error
    case 'POLICY_EVALUATION_ERROR':
      return 500;

    // 404 Not Found
    case 'APPROVAL_CHAIN_NOT_FOUND':
    case 'APPROVAL_STEP_NOT_FOUND':
    case 'WORKFLOW_NOT_FOUND':
    case 'WORKFLOW_STEP_NOT_FOUND':
    case 'CURRENT_STEP_NOT_FOUND':
    case 'POLICY_NOT_FOUND':
    case 'VIOLATION_NOT_FOUND':
    case 'EXEMPTION_NOT_FOUND':
      return 404;

    // 403 Forbidden
    case 'UNAUTHORIZED_WORKSPACE_ACCESS':
    case 'UNAUTHORIZED_APPROVER':
    case 'SELF_APPROVAL_NOT_ALLOWED':
    case 'UNAUTHORIZED_VIOLATION_ACTION':
    case 'UNAUTHORIZED_EXEMPTION_APPROVAL':
    case 'UNAUTHORIZED_WORKFLOW_CANCELLATION':
    case 'UNAUTHORIZED_WORKFLOW_VIEW':
    case 'UNAUTHORIZED_WORKFLOW_INITIATION':
      return 403;

    // 409 Conflict
    case 'WORKFLOW_ALREADY_EXISTS':
    case 'POLICY_NAME_EXISTS':
    case 'APPROVAL_ALREADY_PROCESSED':
    case 'WORKFLOW_ALREADY_COMPLETED':
    case 'WORKFLOW_STEP_MISMATCH':
    case 'EXPENSE_NOT_SUBMITTED':
    case 'APPROVAL_CHAIN_IN_USE':
    case 'CONCURRENCY_CONFLICT':
    case 'POLICY_ALREADY_ACTIVE':
    case 'POLICY_ALREADY_INACTIVE':
    case 'VIOLATION_ALREADY_RESOLVED':
    case 'EXEMPTION_ALREADY_PROCESSED':
      return 409;

    // 400 Bad Request
    case 'INVALID_APPROVAL_TRANSITION':
    case 'INVALID_DELEGATION':
    case 'NO_MATCHING_APPROVAL_CHAIN':
    case 'REJECTION_REASON_REQUIRED':
    case 'EMPTY_APPROVER_SEQUENCE':
    case 'DUPLICATE_APPROVERS_IN_SEQUENCE':
    case 'INVALID_AMOUNT_RANGE':
    case 'INVALID_APPROVAL_CHAIN_NAME':
    case 'INVALID_POLICY_CONFIGURATION':
    case 'POLICY_NAME_REQUIRED':
    case 'POLICY_NAME_TOO_LONG':
    case 'POLICY_DESCRIPTION_TOO_LONG':
    case 'INVALID_THRESHOLD':
    case 'INVALID_VIOLATION_TRANSITION':
    case 'EXEMPTION_EXPIRED':
    case 'INVALID_EXEMPTION_DATE_RANGE':
    case 'EXPENSE_BLOCKED_BY_POLICY':
    case 'INVALID_UUID':
    case 'INVALID_UUID_FORMAT':
    case 'INVALID_STEP_NUMBER':
    case 'MAX_APPROVERS_EXCEEDED':
    case 'APPROVAL_CHAIN_DESCRIPTION_TOO_LONG':
    case 'APPROVAL_COMMENT_TOO_LONG':
    case 'INVALID_PRIORITY':
    case 'EXEMPTION_DURATION_EXCEEDED':
    case 'EXEMPTION_REASON_LENGTH_INVALID':
    case 'VIOLATION_NOTE_LENGTH_INVALID':
    case 'INVALID_POLICY_SCOPE':
      return 400;

    default:
      return 500;
  }
}

/**
 * Resolves the HTTP status code for any thrown error or domain error.
 */
export function resolveHttpStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 500;

  if ('statusCode' in error && typeof (error as any).statusCode === 'number' && (error as any).statusCode < 600) {
    return (error as any).statusCode;
  }

  if ('code' in error && typeof (error as any).code === 'string') {
    return mapDomainCodeToHttpStatus((error as any).code);
  }

  if (error instanceof PureDomainError) {
    return 400;
  }

  return 500;
}
