import { z } from "zod";

/**
 * Update Global Preferences Schema
 */
export const updateGlobalPreferencesSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
});

export type UpdateGlobalPreferencesInput = z.infer<
  typeof updateGlobalPreferencesSchema
>;

/**
 * Update Type Preference Schema
 */
export const updateTypePreferenceSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
});

export type UpdateTypePreferenceInput = z.infer<
  typeof updateTypePreferenceSchema
>;

/**
 * Check Channel Enabled Query Schema
 */
export const checkChannelEnabledSchema = z.object({
  type: z.string(),
  channel: z.enum(["email", "inApp", "push"]),
});

export type CheckChannelEnabledQuery = z.infer<
  typeof checkChannelEnabledSchema
>;
