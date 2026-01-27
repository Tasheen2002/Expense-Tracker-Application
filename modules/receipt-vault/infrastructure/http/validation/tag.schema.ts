import { z } from 'zod'
import {
  MAX_TAG_NAME_LENGTH,
  MIN_TAG_NAME_LENGTH,
  MAX_TAG_DESCRIPTION_LENGTH,
  HEX_COLOR_REGEX,
} from '../../../domain/constants/receipt.constants'

// Create Tag Schema
export const createTagSchema = z.object({
  name: z
    .string()
    .min(MIN_TAG_NAME_LENGTH, `Tag name must be at least ${MIN_TAG_NAME_LENGTH} characters`)
    .max(MAX_TAG_NAME_LENGTH, `Tag name cannot exceed ${MAX_TAG_NAME_LENGTH} characters`)
    .trim(),
  color: z
    .string()
    .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g., #FF5733)')
    .optional(),
  description: z
    .string()
    .max(MAX_TAG_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_TAG_DESCRIPTION_LENGTH} characters`)
    .optional(),
})

export type CreateTagInput = z.infer<typeof createTagSchema>

// Update Tag Schema (all fields optional)
export const updateTagSchema = z.object({
  name: z
    .string()
    .min(MIN_TAG_NAME_LENGTH, `Tag name must be at least ${MIN_TAG_NAME_LENGTH} characters`)
    .max(MAX_TAG_NAME_LENGTH, `Tag name cannot exceed ${MAX_TAG_NAME_LENGTH} characters`)
    .trim()
    .optional(),
  color: z
    .string()
    .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g., #FF5733)')
    .optional(),
  description: z
    .string()
    .max(MAX_TAG_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_TAG_DESCRIPTION_LENGTH} characters`)
    .optional(),
})

export type UpdateTagInput = z.infer<typeof updateTagSchema>

// Add Tag to Receipt Schema
export const addTagToReceiptSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID format'),
})

export type AddTagToReceiptInput = z.infer<typeof addTagToReceiptSchema>
