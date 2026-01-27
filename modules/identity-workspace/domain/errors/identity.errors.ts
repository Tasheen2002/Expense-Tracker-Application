/**
 * Base error class for Identity-Workspace module
 */
export class IdentityWorkspaceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * User-related errors
 */
export class UserNotFoundError extends IdentityWorkspaceError {
  constructor(identifier: string) {
    super(
      `User ${identifier} not found`,
      'USER_NOT_FOUND',
      404
    );
  }
}

export class UserAlreadyExistsError extends IdentityWorkspaceError {
  constructor(email: string) {
    super(
      `User with email '${email}' already exists`,
      'USER_ALREADY_EXISTS',
      409
    );
  }
}

export class InvalidCredentialsError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Invalid email or password',
      'INVALID_CREDENTIALS',
      401
    );
  }
}

export class EmailNotVerifiedError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Email address has not been verified',
      'EMAIL_NOT_VERIFIED',
      403
    );
  }
}

export class UserInactiveError extends IdentityWorkspaceError {
  constructor() {
    super(
      'User account is inactive',
      'USER_INACTIVE',
      403
    );
  }
}

/**
 * Workspace-related errors
 */
export class WorkspaceNotFoundError extends IdentityWorkspaceError {
  constructor(identifier: string) {
    super(
      `Workspace ${identifier} not found`,
      'WORKSPACE_NOT_FOUND',
      404
    );
  }
}

export class WorkspaceAlreadyExistsError extends IdentityWorkspaceError {
  constructor(slug: string) {
    super(
      `Workspace with slug '${slug}' already exists`,
      'WORKSPACE_ALREADY_EXISTS',
      409
    );
  }
}

export class WorkspaceInactiveError extends IdentityWorkspaceError {
  constructor(workspaceId: string) {
    super(
      `Workspace ${workspaceId} is inactive`,
      'WORKSPACE_INACTIVE',
      403
    );
  }
}

/**
 * Membership-related errors
 */
export class MembershipNotFoundError extends IdentityWorkspaceError {
  constructor(userId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Membership for user ${userId} in workspace ${workspaceId} not found`
      : `Membership ${userId} not found`;
    super(message, 'MEMBERSHIP_NOT_FOUND', 404);
  }
}

export class MembershipAlreadyExistsError extends IdentityWorkspaceError {
  constructor(userId: string, workspaceId: string) {
    super(
      `User ${userId} is already a member of workspace ${workspaceId}`,
      'MEMBERSHIP_ALREADY_EXISTS',
      409
    );
  }
}

export class InsufficientPermissionsError extends IdentityWorkspaceError {
  constructor(operation: string) {
    super(
      `Insufficient permissions to ${operation}`,
      'INSUFFICIENT_PERMISSIONS',
      403
    );
  }
}

export class CannotRemoveOwnerError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Cannot remove the workspace owner. Transfer ownership first.',
      'CANNOT_REMOVE_OWNER',
      400
    );
  }
}

/**
 * Invitation-related errors
 */
export class InvitationNotFoundError extends IdentityWorkspaceError {
  constructor(token: string) {
    super(
      `Invitation with token ${token} not found`,
      'INVITATION_NOT_FOUND',
      404
    );
  }
}

export class InvitationExpiredError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Invitation has expired',
      'INVITATION_EXPIRED',
      400
    );
  }
}

export class InvitationAlreadyAcceptedError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Invitation has already been accepted',
      'INVITATION_ALREADY_ACCEPTED',
      400
    );
  }
}

/**
 * Session-related errors
 */
export class SessionNotFoundError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Session not found or expired',
      'SESSION_NOT_FOUND',
      401
    );
  }
}

export class SessionExpiredError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Session has expired',
      'SESSION_EXPIRED',
      401
    );
  }
}
