import { DomainError, DomainValidationError } from '@core/domain/domain-error';

/**
 * Base error class for Identity-Workspace module
 */
export class IdentityWorkspaceError extends DomainError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 400
  ) {
    super(message, code, statusCode);
  }
}

// ============================================================================
// 1. Validation Errors (400)
// ============================================================================

export class InvalidPasswordError extends DomainValidationError {
  constructor() {
    super('Password must contain at least 8 characters and at most 72 UTF-8 bytes', 'INVALID_PASSWORD', 'password');
  }
}

export class InvalidRoleError extends DomainValidationError {
  constructor(role?: string) {
    super(
      role ? `Invalid workspace role: ${role}` : 'Invalid workspace role',
      'INVALID_ROLE',
      'role'
    );
  }
}

export class InvalidPasswordHashError extends DomainValidationError {
  constructor() {
    super('Password hash cannot be empty', 'INVALID_PASSWORD_HASH', 'passwordHash');
  }
}

export class InvalidWorkspaceNameError extends DomainValidationError {
  constructor() {
    super('Workspace name cannot be empty', 'INVALID_WORKSPACE_NAME', 'name');
  }
}

export class UserLookupCriteriaRequiredError extends DomainValidationError {
  constructor() {
    super('Either userId or email is required', 'USER_LOOKUP_CRITERIA_REQUIRED');
  }
}

export class InvalidFullNameError extends DomainValidationError {
  constructor() {
    super('Full name cannot exceed 255 characters', 'INVALID_FULL_NAME', 'fullName');
  }
}

export class InvalidInvitationExpiryError extends DomainValidationError {
  constructor() {
    super('Invitation expiry must be between 1 and 720 hours', 'INVALID_INVITATION_EXPIRY', 'expiryHours');
  }
}

export class WorkspaceInvitationLimitReachedError extends IdentityWorkspaceError {
  constructor(limit: number = 50) {
    super(`Workspace invitation limit of ${limit} reached`, 'INVITATION_LIMIT_REACHED', 400);
  }
}

// ============================================================================
// 2. Not Found Errors (404)
// ============================================================================

export class UserNotFoundError extends IdentityWorkspaceError {
  constructor(identifier: string) {
    super(`User ${identifier} not found`, 'USER_NOT_FOUND', 404);
  }
}

export class WorkspaceNotFoundError extends IdentityWorkspaceError {
  constructor(identifier: string) {
    super(`Workspace ${identifier} not found`, 'WORKSPACE_NOT_FOUND', 404);
  }
}

export class MembershipNotFoundError extends IdentityWorkspaceError {
  constructor(userId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Membership for user ${userId} in workspace ${workspaceId} not found`
      : `Membership ${userId} not found`;
    super(message, 'MEMBERSHIP_NOT_FOUND', 404);
  }
}

export class InvitationNotFoundError extends IdentityWorkspaceError {
  constructor(identifier?: string) {
    const message = identifier
      ? `Invitation '${identifier}' not found`
      : 'Invitation not found';
    super(message, 'INVITATION_NOT_FOUND', 404);
  }
}

// ============================================================================
// 3. Conflict Errors (409)
// ============================================================================

export class UserAlreadyExistsError extends IdentityWorkspaceError {
  constructor(email: string) {
    super(`User with email '${email}' already exists`, 'USER_ALREADY_EXISTS', 409);
  }
}

export class WorkspaceAlreadyExistsError extends IdentityWorkspaceError {
  constructor(slug: string) {
    super(`Workspace with slug '${slug}' already exists`, 'WORKSPACE_ALREADY_EXISTS', 409);
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

export class DuplicateInvitationError extends IdentityWorkspaceError {
  constructor(email: string, workspaceId: string) {
    super(
      `Pending invitation already exists for email ${email} and workspace ${workspaceId}`,
      'DUPLICATE_INVITATION',
      409
    );
  }
}

// ============================================================================
// 4. Authorization / Authentication Errors (401, 403)
// ============================================================================

export class InvalidCredentialsError extends IdentityWorkspaceError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }
}

export class SessionNotFoundError extends IdentityWorkspaceError {
  constructor() {
    super('Session not found or expired', 'SESSION_NOT_FOUND', 401);
  }
}

export class SessionExpiredError extends IdentityWorkspaceError {
  constructor() {
    super('Session has expired', 'SESSION_EXPIRED', 401);
  }
}

export class EmailNotVerifiedError extends IdentityWorkspaceError {
  constructor() {
    super('Email address has not been verified', 'EMAIL_NOT_VERIFIED', 403);
  }
}

export class UserInactiveError extends IdentityWorkspaceError {
  constructor() {
    super('User account is inactive', 'USER_INACTIVE', 403);
  }
}

export class WorkspaceInactiveError extends IdentityWorkspaceError {
  constructor(workspaceId: string) {
    super(`Workspace ${workspaceId} is inactive`, 'WORKSPACE_INACTIVE', 403);
  }
}

export class InsufficientPermissionsError extends IdentityWorkspaceError {
  constructor(operation: string = 'perform this operation') {
    super(`Insufficient permissions to ${operation}`, 'INSUFFICIENT_PERMISSIONS', 403);
  }
}

// ============================================================================
// 5. Business Rule / Lifecycle Errors (422)
// ============================================================================

export class CannotRemoveOwnerError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Cannot remove the workspace owner. Transfer ownership first.',
      'CANNOT_REMOVE_OWNER',
      422
    );
  }
}

export class CannotChangeOwnerRoleError extends IdentityWorkspaceError {
  constructor() {
    super(
      'Cannot change owner role. Transfer ownership first.',
      'CANNOT_CHANGE_OWNER_ROLE',
      422
    );
  }
}

export class InvitationExpiredError extends IdentityWorkspaceError {
  constructor() {
    super('Invitation has expired', 'INVITATION_EXPIRED', 422);
  }
}

export class InvitationAlreadyAcceptedError extends IdentityWorkspaceError {
  constructor() {
    super('Invitation has already been accepted', 'INVITATION_ALREADY_ACCEPTED', 422);
  }
}

export class InvitationEmailMismatchError extends IdentityWorkspaceError {
  constructor() {
    super('Invitation email does not match user email', 'INVITATION_EMAIL_MISMATCH', 422);
  }
}

export class InvitationCancelledError extends IdentityWorkspaceError {
  constructor() {
    super('Invitation has been cancelled', 'INVITATION_CANCELLED', 410);
  }
}
