import { z } from "zod";
import { NotificationType } from "../../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../../domain/enums/notification-channel.enum";

/**
 * Create Template Schema
 */
export const createTemplateSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID").optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: "Invalid notification type" }),
  }),
  channel: z.nativeEnum(NotificationChannel, {
    errorMap: () => ({ message: "Invalid notification channel" }),
  }),
  subjectTemplate: z
    .string()
    .min(1, "Subject template is required")
    .max(255, "Subject template cannot exceed 255 characters"),
  bodyTemplate: z.string().min(1, "Body template is required"),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/**
 * Update Template Schema
 */
export const updateTemplateSchema = z.object({
  subjectTemplate: z.string().max(255).optional(),
  bodyTemplate: z.string().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

/**
 * Get Active Template Query Schema
 */
export const getActiveTemplateSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: "Invalid notification type" }),
  }),
  channel: z.nativeEnum(NotificationChannel, {
    errorMap: () => ({ message: "Invalid notification channel" }),
  }),
});

export type GetActiveTemplateQuery = z.infer<typeof getActiveTemplateSchema>;
