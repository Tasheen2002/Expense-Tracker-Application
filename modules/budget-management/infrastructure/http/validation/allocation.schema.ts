import { z } from 'zod'
import {
  MIN_ALLOCATION_AMOUNT,
  MAX_BUDGET_AMOUNT,
  ALLOCATION_DESCRIPTION_MAX_LENGTH,
} from '../../../domain/constants/budget.constants'

/**
 * Add Allocation Schema
 */
export const addAllocationSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  allocatedAmount: z
    .number()
    .min(MIN_ALLOCATION_AMOUNT, `Allocated amount must be at least ${MIN_ALLOCATION_AMOUNT}`)
    .max(MAX_BUDGET_AMOUNT, `Allocated amount cannot exceed ${MAX_BUDGET_AMOUNT}`),
  description: z
    .string()
    .max(ALLOCATION_DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${ALLOCATION_DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
})

export type AddAllocationInput = z.infer<typeof addAllocationSchema>

/**
 * Update Allocation Schema
 */
export const updateAllocationSchema = z.object({
  allocatedAmount: z
    .number()
    .min(MIN_ALLOCATION_AMOUNT)
    .max(MAX_BUDGET_AMOUNT)
    .optional(),
  description: z
    .string()
    .max(ALLOCATION_DESCRIPTION_MAX_LENGTH)
    .optional()
    .nullable(),
})

export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>
