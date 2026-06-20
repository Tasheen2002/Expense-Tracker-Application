import { z } from 'zod';
import { toJsonSchema } from './validator';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../../domain/enums/notification-channel.enum';
import { NotificationPriority } from '../../../domain/enums/notification-priority.enum';

// ============================================
// Params Schemas
// ============================================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const markAsReadParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  notificationId: z.string().uuid('Invalid notification ID format'),
});

// ============================================
// Core Schemas
// ============================================

export const sendNotificationSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Invalid notification type' }),
  }),
  channel: z.nativeEnum(NotificationChannel, {
    errorMap: () => ({ message: 'Invalid notification channel' }),
  }),
  priority: z
    .nativeEnum(NotificationPriority)
    .optional()
    .default(NotificationPriority.MEDIUM),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title cannot exceed 255 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content cannot exceed 5000 characters'),
  data: z.record(z.unknown()).optional(),
});

export const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const markAsReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

// Inferred input & query types
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

// ============================================
// Response Envelope Schemas
// ============================================

export const notificationResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel),
  priority: z.nativeEnum(NotificationPriority),
  title: z.string(),
  content: z.string(),
  data: z.record(z.unknown()).optional(),
  status: z.string(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationListEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    notifications: z.array(notificationResponseSchema),
    unreadCount: z.number(),
    pagination: z.object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  }),
});

export const unreadNotificationListEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    notifications: z.array(notificationResponseSchema),
    pagination: z.object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  }),
});

export const baseResponseEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.any().optional(),
});

// JSON Schema Exports
export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const markAsReadParamsJsonSchema = toJsonSchema(markAsReadParamsSchema);
export const listNotificationsQueryJsonSchema = toJsonSchema(listNotificationsSchema);
export const notificationListEnvelopeJsonSchema = toJsonSchema(notificationListEnvelopeSchema);
export const unreadNotificationListEnvelopeJsonSchema = toJsonSchema(unreadNotificationListEnvelopeSchema);
export const baseResponseEnvelopeJsonSchema = toJsonSchema(baseResponseEnvelopeSchema);

