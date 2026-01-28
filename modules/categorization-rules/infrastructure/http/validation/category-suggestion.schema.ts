import { z } from 'zod'

export const createSuggestionSchema = z.object({
  expenseId: z.string().uuid('Invalid expense ID format'),
  suggestedCategoryId: z.string().uuid('Invalid category ID format'),
  confidence: z
    .number()
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1'),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
})

export const suggestionIdParamSchema = z.object({
  suggestionId: z.string().uuid('Invalid suggestion ID format'),
})

export type CreateSuggestionBody = z.infer<typeof createSuggestionSchema>
export type SuggestionIdParam = z.infer<typeof suggestionIdParamSchema>
