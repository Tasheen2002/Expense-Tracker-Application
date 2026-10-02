import { ExpenseLedgerError } from './expense.errors';

export class UnauthorizedWorkspaceAccessError extends ExpenseLedgerError {
  constructor(
    message: string = 'Access denied: User is not an authorized member of this workspace'
  ) {
    super(message, 'UNAUTHORIZED_WORKSPACE_ACCESS', 403);
  }
}

export class IdentityServiceUnavailableError extends ExpenseLedgerError {
  constructor(message: string = 'Identity Access Service is temporarily unavailable') {
    super(message, 'DOWNSTREAM_SERVICE_UNAVAILABLE', 503);
  }
}

export class DownstreamServiceError extends ExpenseLedgerError {
  constructor(message: string = 'Invalid or unexpected response received from downstream service') {
    super(message, 'DOWNSTREAM_SERVICE_ERROR', 502);
  }
}
