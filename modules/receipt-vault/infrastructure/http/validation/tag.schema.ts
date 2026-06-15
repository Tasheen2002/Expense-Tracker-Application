import { z } from 'zod';
import { toJsonSchema } from './validator';
import {
  MAX_TAG_NAME_LENGTH,
  MIN_TAG_NAME_LENGTH,
  MAX_TAG_DESCRIPTION_LENGTH,
  HEX_COLOR_REGEX,
} from '../../../domain/constants/receipt.constants';

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
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

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
});

export type UpdateTagInput = z.infer<typeof updateTagSchema>;

// Add Tag to Receipt Schema
export const addTagToReceiptSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID format'),
});

export type AddTagToReceiptInput = z.infer<typeof addTagToReceiptSchema>;

// Response schemas
export const receiptTagDefinitionResponseSchema = z.object({
  tagId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  createdAt: z.string(),
});

// Pre-computed JSON schemas
export const createTagBodyJsonSchema = toJsonSchema(createTagSchema);
export const updateTagBodyJsonSchema = toJsonSchema(updateTagSchema);
export const addTagToReceiptBodyJsonSchema = toJsonSchema(addTagToReceiptSchema);

// Response envelopes
export const tagEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: receiptTagDefinitionResponseSchema,
  })
);

export const tagListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(receiptTagDefinitionResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const paginationQueryJsonSchema = toJsonSchema(paginationQuerySchema);

