import { z } from 'zod';
import { toJsonSchema } from './validator';

// ==================== PARAM SCHEMAS ====================

export const categoryParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  categoryId: z.string().uuid('Invalid category ID format'),
});

// ==================== REQUEST SCHEMAS ====================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format').optional(),
  icon: z.string().max(50, 'Icon name cannot exceed 50 characters').optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listCategoriesQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ==================== RESPONSE SCHEMAS ====================

export const categoryResponseSchema = z.object({
  categoryId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==================== INFERRED INPUT TYPES ====================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

// ==================== PRE-COMPUTED JSON SCHEMAS ====================

export const categoryParamsJsonSchema = toJsonSchema(categoryParamsSchema);
export const createCategoryBodyJsonSchema = toJsonSchema(createCategorySchema);
export const updateCategoryBodyJsonSchema = toJsonSchema(updateCategorySchema);
export const listCategoriesQueryJsonSchema = toJsonSchema(listCategoriesQuerySchema);

// ==================== ENVELOPE JSON SCHEMAS ====================

export const categoryEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: categoryResponseSchema,
  })
);

export const paginatedCategoriesEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(categoryResponseSchema),
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
