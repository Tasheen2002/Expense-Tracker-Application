import { z } from 'zod';

// ==================== COMMON SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const templateParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  templateId: z.string().uuid(),
});

export const notificationParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  notificationId: z.string().uuid(),
});

// ==================== TEMPLATE SCHEMAS ====================

export const TemplateTypeSchema = z.enum([
  'EXPENSE_APPROVED',
  'EXPENSE_REJECTED',
  'APPROVAL_REQUIRED',
  'BUDGET_ALERT',
  'INVITATION',
  'SYSTEM_ALERT',
]);

export const TemplateChannelSchema = z.enum(['EMAIL', 'IN_APP', 'PUSH']);

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

// ==================== NOTIFICATION SCHEMAS ====================

export const listNotificationsSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().min(1).max(100).default(50)),
  offset: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().min(0).default(0)),
});

// ==================== PREFERENCE SCHEMAS ====================

export const preferenceTypeParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  type: TemplateTypeSchema,
});

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
