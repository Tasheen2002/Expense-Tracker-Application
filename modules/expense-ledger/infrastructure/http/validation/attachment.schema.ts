import { z } from 'zod'
import { toJsonSchema } from './validator'
import {
  MAX_ATTACHMENT_SIZE,
  MIN_ATTACHMENT_SIZE,
  ALLOWED_ATTACHMENT_MIME_TYPES,
} from '../../../domain/constants/expense.constants'

/**
 * Params Schemas
 */
export const workspaceExpenseParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  expenseId: z.string().uuid('Invalid expense ID format'),
});

export const attachmentParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  expenseId: z.string().uuid('Invalid expense ID format'),
  attachmentId: z.string().uuid('Invalid attachment ID format'),
});

/**
 * Create Attachment Schema
 */
export const createAttachmentSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name cannot exceed 255 characters'),
  filePath: z.string().min(1, 'File path is required').max(500, 'File path cannot exceed 500 characters'),
  fileSize: z
    .number()
    .int('File size must be an integer')
    .min(MIN_ATTACHMENT_SIZE, `File size must be at least ${MIN_ATTACHMENT_SIZE} byte`)
    .max(MAX_ATTACHMENT_SIZE, `File size cannot exceed ${MAX_ATTACHMENT_SIZE} bytes`),
  mimeType: z
    .string()
    .refine((val) => ALLOWED_ATTACHMENT_MIME_TYPES.includes(val), {
      message: `File type not allowed. Allowed types: ${ALLOWED_ATTACHMENT_MIME_TYPES.join(', ')}`,
    }),
})

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>

export const workspaceExpenseParamsJsonSchema = toJsonSchema(workspaceExpenseParamsSchema);
export const attachmentParamsJsonSchema = toJsonSchema(attachmentParamsSchema);
export const createAttachmentBodyJsonSchema = toJsonSchema(createAttachmentSchema);

