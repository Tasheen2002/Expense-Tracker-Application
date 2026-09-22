/**
 * Centralized, strongly-typed event registry for identity-access-service.
 *
 * Defines transport-neutral domain event constants across the service.
 */

export const IDENTITY_EVENTS = {
  // User lifecycle events
  USER_CREATED: 'UserCreated',
  USER_CREATED_DOT: 'identity.user_created',
  USER_EMAIL_VERIFIED: 'UserEmailVerified',
  USER_EMAIL_VERIFIED_DOT: 'identity.user_email_verified',
  USER_PASSWORD_CHANGED: 'UserPasswordChanged',
  USER_PASSWORD_CHANGED_DOT: 'identity.user_password_changed',
  USER_EMAIL_CHANGED: 'UserEmailChanged',
  USER_EMAIL_CHANGED_DOT: 'identity.user_email_changed',
  USER_DEACTIVATED: 'UserDeactivated',
  USER_DEACTIVATED_DOT: 'identity.user_deactivated',
  USER_ACTIVATED: 'UserActivated',
  USER_ACTIVATED_DOT: 'identity.user_activated',
  USER_PROFILE_UPDATED: 'UserProfileUpdated',
  USER_PROFILE_UPDATED_DOT: 'identity.user_profile_updated',

  // Workspace lifecycle events
  WORKSPACE_CREATED: 'WorkspaceCreated',
  WORKSPACE_CREATED_DOT: 'identity.workspace_created',
  WORKSPACE_RENAMED: 'WorkspaceRenamed',
  WORKSPACE_RENAMED_DOT: 'identity.workspace_renamed',
  WORKSPACE_DEACTIVATED: 'WorkspaceDeactivated',
  WORKSPACE_DEACTIVATED_DOT: 'identity.workspace_deactivated',
  WORKSPACE_ACTIVATED: 'WorkspaceActivated',
  WORKSPACE_ACTIVATED_DOT: 'identity.workspace_activated',
  WORKSPACE_DELETED: 'WorkspaceDeleted',
  WORKSPACE_DELETED_DOT: 'identity.workspace_deleted',
  WORKSPACE_OWNERSHIP_TRANSFERRED: 'WorkspaceOwnershipTransferred',
  WORKSPACE_OWNERSHIP_TRANSFERRED_DOT: 'identity.workspace_ownership_transferred',

  // Workspace membership events
  MEMBER_JOINED: 'MemberJoinedWorkspace',
  MEMBER_JOINED_DOT: 'identity.member_joined',
  MEMBER_ROLE_CHANGED: 'MemberRoleChanged',
  MEMBER_ROLE_CHANGED_DOT: 'identity.member_role_changed',
  MEMBER_REMOVED: 'MemberRemoved',
  MEMBER_REMOVED_DOT: 'identity.member_removed',

  // Invitation lifecycle events
  INVITATION_CREATED: 'InvitationCreated',
  INVITATION_CREATED_DOT: 'identity.invitation_created',
  INVITATION_ACCEPTED: 'InvitationAccepted',
  INVITATION_ACCEPTED_DOT: 'identity.invitation_accepted',
  INVITATION_CANCELLED: 'InvitationCancelled',
  INVITATION_CANCELLED_DOT: 'identity.invitation_cancelled',
} as const;

export type IdentityEventType =
  (typeof IDENTITY_EVENTS)[keyof typeof IDENTITY_EVENTS];

// Re-export buildWebhookRoutes from infrastructure for backward-compatibility & ergonomics
export { buildWebhookRoutes } from '../infrastructure/webhooks/webhook-routing';
