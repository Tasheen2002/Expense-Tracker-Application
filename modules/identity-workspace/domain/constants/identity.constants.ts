/**
 * Identity-Workspace Module Constants
 */

// User validation constants
export const USER_EMAIL_MAX_LENGTH = 255
export const USER_FULLNAME_MAX_LENGTH = 255
export const USER_PASSWORD_MIN_LENGTH = 8
export const USER_PASSWORD_MAX_LENGTH = 128

// Workspace validation constants
export const WORKSPACE_NAME_MIN_LENGTH = 1
export const WORKSPACE_NAME_MAX_LENGTH = 100
export const WORKSPACE_SLUG_MIN_LENGTH = 1
export const WORKSPACE_SLUG_MAX_LENGTH = 50
export const WORKSPACE_SLUG_REGEX = /^[a-z0-9-]+$/

// Membership roles
export const WORKSPACE_ROLES = ['owner', 'admin', 'member'] as const
export type WorkspaceRole = typeof WORKSPACE_ROLES[number]

// Invitation validation
export const INVITATION_TOKEN_LENGTH = 32
export const INVITATION_EXPIRY_HOURS = 72 // 3 days
export const MAX_INVITATIONS_PER_WORKSPACE = 100

// Session validation
export const SESSION_EXPIRY_HOURS = 24 * 7 // 7 days
export const MAX_SESSIONS_PER_USER = 5

// Email validation regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password strength requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: USER_PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
}
