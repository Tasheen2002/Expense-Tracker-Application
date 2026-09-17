import { z } from 'zod'
import { toJsonSchema } from './validator'
import {
  TAG_NAME_MIN_LENGTH,
  TAG_NAME_MAX_LENGTH,
  TAG_COLOR_REGEX,
} from '../../../domain/constants/expense.constants'

/**
 * Params Schema
 */
export const tagParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  tagId: z.string().uuid('Invalid tag ID format'),
});

/**
 * Create Tag Schema
 */
export const createTagSchema = z.object({
  name: z
    .string()
    .min(TAG_NAME_MIN_LENGTH, 'Tag name is required')
    .max(TAG_NAME_MAX_LENGTH, `Tag name cannot exceed ${TAG_NAME_MAX_LENGTH} characters`),
  color: z
    .string()
    .regex(TAG_COLOR_REGEX, 'Color must be a valid hex code (e.g., #FF5733)')
    .optional(),
})

export type CreateTagInput = z.infer<typeof createTagSchema>

/**
 * Update Tag Schema
 */
export const updateTagSchema = z.object({
  name: z
    .string()
    .min(TAG_NAME_MIN_LENGTH)
    .max(TAG_NAME_MAX_LENGTH)
    .optional(),
  color: z.string().regex(TAG_COLOR_REGEX).optional().nullable(),
})

export type UpdateTagInput = z.infer<typeof updateTagSchema>

export const tagResponseSchema = z.object({
  tagId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type TagResponse = z.infer<typeof tagResponseSchema>;

export const tagParamsJsonSchema = toJsonSchema(tagParamsSchema);
export const createTagBodyJsonSchema = toJsonSchema(createTagSchema);
export const updateTagBodyJsonSchema = toJsonSchema(updateTagSchema);

// ==================== ENVELOPE JSON SCHEMAS ====================

export const tagEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: tagResponseSchema,
  })
);

export const paginatedTagsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(tagResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);

