/**
 * Notification Dispatch Module Constants
 */

// ============================================
// Notification Validation
// ============================================
export const NOTIFICATION_TITLE_MIN_LENGTH = 1;
export const NOTIFICATION_TITLE_MAX_LENGTH = 255;
export const NOTIFICATION_CONTENT_MAX_LENGTH = 5000;

// ============================================
// Template Validation
// ============================================
export const TEMPLATE_NAME_MIN_LENGTH = 1;
export const TEMPLATE_NAME_MAX_LENGTH = 100;
export const TEMPLATE_SUBJECT_MAX_LENGTH = 255;
export const TEMPLATE_BODY_MAX_LENGTH = 50000;

// ============================================
// Pagination Defaults
// ============================================
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;

// ============================================
// Notification Retention
// ============================================
export const NOTIFICATION_RETENTION_DAYS = 90; // Keep notifications for 90 days
export const MAX_NOTIFICATIONS_PER_USER = 1000;

// ============================================
// Rate Limiting
// ============================================
export const MAX_NOTIFICATIONS_PER_MINUTE = 60;
export const MAX_EMAIL_NOTIFICATIONS_PER_HOUR = 100;
export const MAX_PUSH_NOTIFICATIONS_PER_HOUR = 50;

// ============================================
// Template Variables
// ============================================
export const TEMPLATE_VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
export const MAX_TEMPLATE_VARIABLES = 50;

// ============================================
// Priority Weights (for sorting/ordering)
// ============================================
export const PRIORITY_WEIGHTS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

// ============================================
// Channel Configuration
// ============================================
export const DEFAULT_CHANNELS = ["EMAIL", "IN_APP"] as const;
export const ALL_CHANNELS = [
  "EMAIL",
  "IN_APP",
  "PUSH",
  "SMS",
  "WEBHOOK",
] as const;

// ============================================
// Retry Configuration
// ============================================
export const MAX_SEND_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;
export const RETRY_BACKOFF_MULTIPLIER = 2;
