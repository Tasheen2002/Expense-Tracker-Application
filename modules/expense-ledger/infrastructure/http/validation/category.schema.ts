import { z } from 'zod'
import {
  CATEGORY_NAME_MIN_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_COLOR_REGEX,
} from '../../../domain/constants/expense.constants'

/**
 * Create Category Schema
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(CATEGORY_NAME_MIN_LENGTH, 'Category name is required')
    .max(CATEGORY_NAME_MAX_LENGTH, `Category name cannot exceed ${CATEGORY_NAME_MAX_LENGTH} characters`),
  description: z
    .string()
    .max(CATEGORY_DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${CATEGORY_DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
  color: z
    .string()
    .regex(CATEGORY_COLOR_REGEX, 'Color must be a valid hex code (e.g., #FF5733)')
    .optional(),
  icon: z.string().max(50, 'Icon name cannot exceed 50 characters').optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

/**
 * Update Category Schema
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(CATEGORY_NAME_MIN_LENGTH)
    .max(CATEGORY_NAME_MAX_LENGTH)
    .optional(),
  description: z
    .string()
    .max(CATEGORY_DESCRIPTION_MAX_LENGTH)
    .optional()
    .nullable(),
  color: z.string().regex(CATEGORY_COLOR_REGEX).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
})

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
