import { z } from 'zod';
import { toJsonSchema } from './validator';

// ==================== COMMON ENUMS ====================

export const TemplateTypeSchema = z.enum([
  'EXPENSE_APPROVED',
  'EXPENSE_REJECTED',
  'APPROVAL_REQUIRED',
  'BUDGET_ALERT',
  'INVITATION',
  'SYSTEM_ALERT',
]);

export const TemplateChannelSchema = z.enum(['EMAIL', 'IN_APP', 'PUSH']);

// ==================== COMMON SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const templateParamsSchema = z.object({
  templateId: z.string().uuid('Invalid template ID format'),
});

export const preferenceTypeParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  type: TemplateTypeSchema,
});


export const createTemplateSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  type: TemplateTypeSchema,
  channel: TemplateChannelSchema,
  subjectTemplate: z.string().min(1).max(255),
  bodyTemplate: z.string().min(1),
});

export const updateTemplateSchema = z.object({
  subjectTemplate: z.string().max(255).optional(),
  bodyTemplate: z.string().optional(),
});

export const getActiveTemplateSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  type: TemplateTypeSchema,
  channel: TemplateChannelSchema,
});

// ==================== PREFERENCE SCHEMAS ====================

export const updateGlobalPreferencesSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
});

export const updateTypePreferenceSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
});

export const checkChannelEnabledSchema = z.object({
  type: TemplateTypeSchema,
  channel: z.enum(['email', 'inApp', 'push']),
});

// Inferred input & query types
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type GetActiveTemplateQuery = z.infer<typeof getActiveTemplateSchema>;
export type UpdateGlobalPreferencesInput = z.infer<typeof updateGlobalPreferencesSchema>;
export type UpdateTypePreferenceInput = z.infer<typeof updateTypePreferenceSchema>;
export type CheckChannelEnabledQuery = z.infer<typeof checkChannelEnabledSchema>;

// ==================== RESPONSE ENVELOPES ====================

export const notificationPreferenceResponseSchema = z.object({
  id: z.string().uuid(),
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

