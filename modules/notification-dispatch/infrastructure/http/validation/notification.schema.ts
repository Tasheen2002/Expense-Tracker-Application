import { z } from "zod";
import { NotificationType } from "../../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../../domain/enums/notification-channel.enum";
import { NotificationPriority } from "../../../domain/enums/notification-priority.enum";

/**
 * Send Notification Schema
 */
export const sendNotificationSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID"),
  workspaceId: z.string().uuid("Invalid workspace ID"),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: "Invalid notification type" }),
  }),
  channel: z.nativeEnum(NotificationChannel, {
    errorMap: () => ({ message: "Invalid notification channel" }),
  }),
  priority: z
    .nativeEnum(NotificationPriority)
    .optional()
    .default(NotificationPriority.MEDIUM),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(5000, "Content cannot exceed 5000 characters"),
  data: z.record(z.unknown()).optional(),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

/**
 * List Notifications Query Schema
 */
export const listNotificationsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default("50"),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0))
    .optional()
    .default("0"),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;

/**
 * Mark Notification as Read Schema
 */
export const markAsReadSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
