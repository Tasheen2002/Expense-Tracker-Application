import { z } from 'zod';
import { toJsonSchema } from './validator';
import { NotificationType, NotificationChannel } from '../../../domain/enums';
import { domainIdSchema, nonblankText } from './common.schema';
import {
  TEMPLATE_NAME_MIN_LENGTH, TEMPLATE_NAME_MAX_LENGTH,
  TEMPLATE_SUBJECT_MIN_LENGTH, TEMPLATE_SUBJECT_MAX_LENGTH,
  TEMPLATE_BODY_MIN_LENGTH, TEMPLATE_BODY_MAX_LENGTH,
} from '../../../domain/constants';

// ==================== COMMON ENUMS ====================

export const TemplateTypeSchema = z.nativeEnum(NotificationType);

export const TemplateChannelSchema = z.nativeEnum(NotificationChannel);

// ==================== COMMON SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: domainIdSchema,
}).strict();

export const templateParamsSchema = z.object({
  templateId: domainIdSchema,
}).strict();

export const preferenceTypeParamsSchema = z.object({
  workspaceId: domainIdSchema,
  type: TemplateTypeSchema,
}).strict();


export const createTemplateSchema = z.object({
  workspaceId: domainIdSchema.optional(),
  name: nonblankText(TEMPLATE_NAME_MIN_LENGTH, TEMPLATE_NAME_MAX_LENGTH),
  type: TemplateTypeSchema,
  channel: TemplateChannelSchema,
  subjectTemplate: nonblankText(TEMPLATE_SUBJECT_MIN_LENGTH, TEMPLATE_SUBJECT_MAX_LENGTH),
  bodyTemplate: nonblankText(TEMPLATE_BODY_MIN_LENGTH, TEMPLATE_BODY_MAX_LENGTH),
}).strict();

export const updateTemplateSchema = z.object({
  subjectTemplate: nonblankText(TEMPLATE_SUBJECT_MIN_LENGTH, TEMPLATE_SUBJECT_MAX_LENGTH).optional(),
  bodyTemplate: nonblankText(TEMPLATE_BODY_MIN_LENGTH, TEMPLATE_BODY_MAX_LENGTH).optional(),
}).strict();

export const getActiveTemplateSchema = z.object({
  workspaceId: domainIdSchema.optional(),
  type: TemplateTypeSchema,
  channel: TemplateChannelSchema,
}).strict();

// ==================== PREFERENCE SCHEMAS ====================

export const updateGlobalPreferencesSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
}).strict();

export const updateTypePreferenceSchema = updateGlobalPreferencesSchema;

export const checkChannelEnabledSchema = z.object({
  type: TemplateTypeSchema,
  channel: z.enum(['email', 'inApp', 'push']),
}).strict();

// Inferred input & query types
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type GetActiveTemplateQuery = z.infer<typeof getActiveTemplateSchema>;
export type UpdateGlobalPreferencesInput = z.infer<typeof updateGlobalPreferencesSchema>;
export type UpdateTypePreferenceInput = z.infer<typeof updateTypePreferenceSchema>;
export type CheckChannelEnabledQuery = z.infer<typeof checkChannelEnabledSchema>;

// ==================== RESPONSE ENVELOPES ====================

export const notificationPreferenceResponseSchema = z.object({
  typeSettings: z.record(z.object({ email: z.boolean().optional(), inApp: z.boolean().optional(), push: z.boolean().optional() })),
  id: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
});

export const notificationPreferenceEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: notificationPreferenceResponseSchema,
});

export const checkChannelEnabledResponseSchema = z.object({
  type: TemplateTypeSchema,
  channel: z.string(),
  isEnabled: z.boolean(),
});

export const checkChannelEnabledEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: checkChannelEnabledResponseSchema,
});

export const notificationTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid().nullable(),
  name: z.string(),
  type: z.string(),
  channel: z.string(),
  subjectTemplate: z.string(),
  bodyTemplate: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const notificationTemplateEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: notificationTemplateResponseSchema,
});

// JSON Schema Exports
export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const templateParamsJsonSchema = toJsonSchema(templateParamsSchema);
export const preferenceTypeParamsJsonSchema = toJsonSchema(preferenceTypeParamsSchema);
export const createTemplateBodyJsonSchema = toJsonSchema(createTemplateSchema);
export const updateTemplateBodyJsonSchema = toJsonSchema(updateTemplateSchema);
export const getActiveTemplateQueryJsonSchema = toJsonSchema(getActiveTemplateSchema);
export const updateGlobalPreferencesBodyJsonSchema = toJsonSchema(updateGlobalPreferencesSchema);
export const updateTypePreferenceBodyJsonSchema = toJsonSchema(updateTypePreferenceSchema);
export const checkChannelEnabledQueryJsonSchema = toJsonSchema(checkChannelEnabledSchema);
export const notificationPreferenceEnvelopeJsonSchema = toJsonSchema(notificationPreferenceEnvelopeSchema);
export const checkChannelEnabledEnvelopeJsonSchema = toJsonSchema(checkChannelEnabledEnvelopeSchema);
export const notificationTemplateEnvelopeJsonSchema = toJsonSchema(notificationTemplateEnvelopeSchema);
