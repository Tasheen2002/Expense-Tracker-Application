import { z } from 'zod'
import {
  TAG_NAME_MIN_LENGTH,
  TAG_NAME_MAX_LENGTH,
  TAG_COLOR_REGEX,
} from '../../../domain/constants/expense.constants'

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
