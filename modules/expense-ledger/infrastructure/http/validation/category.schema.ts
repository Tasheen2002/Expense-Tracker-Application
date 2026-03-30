import { z } from 'zod';

/**
 * Create Category Schema
 */
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format').optional(),
  icon: z.string().max(50, 'Icon name cannot exceed 50 characters').optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/**
 * Update Category Schema
 */
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/**
 * List Categories Query Schema
 */
export const listCategoriesQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
