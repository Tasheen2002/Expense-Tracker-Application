import { z } from 'zod'
import { RuleConditionType } from '../../../domain/enums/rule-condition-type'

export const createCategoryRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  priority: z.number().int().min(0, 'Priority cannot be negative').optional(),
  conditionType: z.nativeEnum(RuleConditionType),
  conditionValue: z.string().min(1, 'Condition value is required').max(255),
  targetCategoryId: z.string().uuid('Invalid category ID format'),
})

export const updateCategoryRuleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .nullable()
    .optional(),
  priority: z.number().int().min(0, 'Priority cannot be negative').optional(),
  conditionType: z.nativeEnum(RuleConditionType).optional(),
  conditionValue: z.string().min(1).max(255).optional(),
  targetCategoryId: z.string().uuid('Invalid category ID format').optional(),
})

export const ruleIdParamSchema = z.object({
  ruleId: z.string().uuid('Invalid rule ID format'),
})

export type CreateCategoryRuleBody = z.infer<typeof createCategoryRuleSchema>
export type UpdateCategoryRuleBody = z.infer<typeof updateCategoryRuleSchema>
export type RuleIdParam = z.infer<typeof ruleIdParamSchema>
