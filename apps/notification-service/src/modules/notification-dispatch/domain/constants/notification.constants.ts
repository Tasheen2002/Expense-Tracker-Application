/**
 * Notification Dispatch Module Constants
 */
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';

// ============================================
// Notification Validation
// ============================================
export const NOTIFICATION_TITLE_MIN_LENGTH = 1;
export const NOTIFICATION_TITLE_MAX_LENGTH = 255;
export const NOTIFICATION_CONTENT_MIN_LENGTH = 1;
export const NOTIFICATION_CONTENT_MAX_LENGTH = 5000;

// ============================================
// Template Validation
// ============================================
export const TEMPLATE_NAME_MIN_LENGTH = 1;
export const TEMPLATE_NAME_MAX_LENGTH = 100;
export const TEMPLATE_SUBJECT_MIN_LENGTH = 1;
export const TEMPLATE_SUBJECT_MAX_LENGTH = 255;
export const TEMPLATE_BODY_MIN_LENGTH = 1;
export const TEMPLATE_BODY_MAX_LENGTH = 50000;

// ============================================
// Priority Weights (for sorting/ordering)
// ============================================
export const PRIORITY_WEIGHTS: Readonly<Record<NotificationPriority, number>> = Object.freeze({
  [NotificationPriority.LOW]: 1,
  [NotificationPriority.MEDIUM]: 2,
  [NotificationPriority.HIGH]: 3,
  [NotificationPriority.URGENT]: 4,
});

// ============================================
// Channel Configuration
// ============================================
// Default dispatch channels. PUSH is represented by the domain/database but
// requires a provider before it can join the default dispatch workflow.
export const DEFAULT_CHANNELS = Object.freeze([NotificationChannel.EMAIL, NotificationChannel.IN_APP]);
export const ALL_CHANNELS = Object.freeze(Object.values(NotificationChannel));
