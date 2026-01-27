/**
 * Base error class for Identity-Workspace module
 */
export abstract class IdentityWorkspaceError extends Error {
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * User-related errors
 */
export class UserNotFoundError extends IdentityWorkspaceError {
  readonly statusCode = 404

  constructor(identifier: string) {
    super(`User ${identifier} not found`)
  }
}

export class UserAlreadyExistsError extends IdentityWorkspaceError {
  readonly statusCode = 409

  constructor(email: string) {
    super(`User with email '${email}' already exists`)
  }
}

export class InvalidCredentialsError extends IdentityWorkspaceError {
  readonly statusCode = 401

  constructor() {
    super('Invalid email or password')
  }
}

export class EmailNotVerifiedError extends IdentityWorkspaceError {
  readonly statusCode = 403

  constructor() {
    super('Email address has not been verified')
  }
}

export class UserInactiveError extends IdentityWorkspaceError {
  readonly statusCode = 403

  constructor() {
    super('User account is inactive')
  }
}

/**
 * Workspace-related errors
 */
export class WorkspaceNotFoundError extends IdentityWorkspaceError {
  readonly statusCode = 404

  constructor(identifier: string) {
    super(`Workspace ${identifier} not found`)
  }
}

export class WorkspaceAlreadyExistsError extends IdentityWorkspaceError {
  readonly statusCode = 409

  constructor(slug: string) {
    super(`Workspace with slug '${slug}' already exists`)
  }
}

export class WorkspaceInactiveError extends IdentityWorkspaceError {
  readonly statusCode = 403

  constructor(workspaceId: string) {
    super(`Workspace ${workspaceId} is inactive`)
  }
}

/**
 * Membership-related errors
 */
export class MembershipNotFoundError extends IdentityWorkspaceError {
  readonly statusCode = 404

  constructor(userId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Membership for user ${userId} in workspace ${workspaceId} not found`
      : `Membership ${userId} not found`
    super(message)
  }
}

export class MembershipAlreadyExistsError extends IdentityWorkspaceError {
  readonly statusCode = 409

  constructor(userId: string, workspaceId: string) {
    super(`User ${userId} is already a member of workspace ${workspaceId}`)
  }
}

export class InsufficientPermissionsError extends IdentityWorkspaceError {
  readonly statusCode = 403

  constructor(operation: string) {
    super(`Insufficient permissions to ${operation}`)
  }
}

export class CannotRemoveOwnerError extends IdentityWorkspaceError {
  readonly statusCode = 400

  constructor() {
    super('Cannot remove the workspace owner. Transfer ownership first.')
  }
}

/**
 * Invitation-related errors
 */
export class InvitationNotFoundError extends IdentityWorkspaceError {
  readonly statusCode = 404

  constructor(token: string) {
    super(`Invitation with token ${token} not found`)
  }
}

export class InvitationExpiredError extends IdentityWorkspaceError {
  readonly statusCode = 400

  constructor() {
    super('Invitation has expired')
  }
}

export class InvitationAlreadyAcceptedError extends IdentityWorkspaceError {
  readonly statusCode = 400

  constructor() {
    super('Invitation has already been accepted')
  }
}

/**
 * Session-related errors
 */
export class SessionNotFoundError extends IdentityWorkspaceError {
  readonly statusCode = 401

  constructor() {
    super('Session not found or expired')
  }
}

export class SessionExpiredError extends IdentityWorkspaceError {
  readonly statusCode = 401

  constructor() {
    super('Session has expired')
  }
}
