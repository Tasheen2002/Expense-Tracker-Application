import { PureDomainError } from './pure-domain-error';

export class UnauthorizedWorkspaceAccessError extends PureDomainError {
  readonly code = 'UNAUTHORIZED_WORKSPACE_ACCESS';

  constructor(
    message = 'Access denied: User is not an authorized member of this workspace'
  ) {
    super(message);
  }
}

export class IdentityServiceUnavailableError extends PureDomainError {
  readonly code = 'DOWNSTREAM_SERVICE_UNAVAILABLE';

  constructor(message = 'Identity Access Service is temporarily unavailable') {
    super(message);
  }
}

export class DownstreamServiceError extends PureDomainError {
  readonly code = 'DOWNSTREAM_SERVICE_ERROR';

  constructor(message = 'Invalid or unexpected response received from downstream service') {
    super(message);
  }
}
