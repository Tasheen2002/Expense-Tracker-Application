import { z } from 'zod';
import { toJsonSchema } from './validator';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../../domain/enums/notification-channel.enum';
import { NotificationPriority } from '../../../domain/enums/notification-priority.enum';
import { NotificationStatus } from '../../../domain/enums/notification-status.enum';
import { domainIdSchema, nonblankText, paginationInteger } from './common.schema';
import { NOTIFICATION_TITLE_MIN_LENGTH, NOTIFICATION_TITLE_MAX_LENGTH,
  NOTIFICATION_CONTENT_MIN_LENGTH, NOTIFICATION_CONTENT_MAX_LENGTH } from '../../../domain/constants';

// ============================================
// Params Schemas
// ============================================

export const workspaceParamsSchema = z.object({
  workspaceId: domainIdSchema,
}).strict();

export const markAsReadParamsSchema = z.object({
  workspaceId: domainIdSchema,
  notificationId: domainIdSchema,
}).strict();

// ============================================
// Core Schemas
// ============================================

// Internal durable command contract; there is no public HTTP send endpoint.
export const sendNotificationSchema = z.object({
  requestId: domainIdSchema,
  recipientId: domainIdSchema,
  workspaceId: domainIdSchema,
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Invalid notification type' }),
  }),
  priority: z
    .nativeEnum(NotificationPriority)
    .optional()
    .default(NotificationPriority.MEDIUM),
  title: nonblankText(NOTIFICATION_TITLE_MIN_LENGTH, NOTIFICATION_TITLE_MAX_LENGTH).optional(),
  content: nonblankText(NOTIFICATION_CONTENT_MIN_LENGTH, NOTIFICATION_CONTENT_MAX_LENGTH).optional(),
  data: z.record(z.unknown()),
}).strict();

export const listNotificationsSchema = z.object({
  limit: paginationInteger(1, 100, 50),
  offset: paginationInteger(0, 2147483647, 0),
}).strict();

export const markAsReadSchema = z.object({
  notificationId: domainIdSchema,
}).strict();

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
  status: z.nativeEnum(NotificationStatus),
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
