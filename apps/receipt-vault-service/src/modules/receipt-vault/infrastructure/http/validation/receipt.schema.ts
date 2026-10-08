import { z } from 'zod';
import Decimal from 'decimal.js';
import { toJsonSchema } from './validator';
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  MIN_OCR_CONFIDENCE,
  MAX_OCR_CONFIDENCE,
} from '../../../domain/constants/receipt.constants';
import { ReceiptStatus } from '../../../domain/enums/receipt-status';
import { ReceiptType } from '../../../domain/enums/receipt-type';

// Upload Receipt Schema
export const uploadReceiptSchema = z
  .object({
    originalName: z.string().trim().min(1).max(255),
    fileContent: z
      .string()
      .min(4)
      .max(Math.ceil(MAX_FILE_SIZE / 3) * 4),
    mimeType: z
      .string()
      .refine(
        (value) => ALLOWED_MIME_TYPES.includes(value),
        'Unsupported MIME type'
      ),
    receiptType: z.nativeEnum(ReceiptType).optional(),
  })
  .strict();

export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;

// Link to Expense Schema
export const linkToExpenseSchema = z.object({
  expenseId: z.string().uuid('Invalid expense ID format'),
});

export type LinkToExpenseInput = z.infer<typeof linkToExpenseSchema>;

// Process Receipt Schema
export const processReceiptSchema = z.object({
  ocrText: z.string().optional(),
  ocrConfidence: z
    .number()
    .min(
      MIN_OCR_CONFIDENCE,
      `OCR confidence must be at least ${MIN_OCR_CONFIDENCE}`
    )
    .max(
      MAX_OCR_CONFIDENCE,
      `OCR confidence cannot exceed ${MAX_OCR_CONFIDENCE}`
    )
    .refine(
      (value) => new Decimal(value).decimalPlaces() <= 2,
      'OCR confidence must have at most two decimals'
    )
    .optional(),
});

export type ProcessReceiptInput = z.infer<typeof processReceiptSchema>;

// Reject Receipt Schema
export const rejectReceiptSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500).optional(),
});

export type RejectReceiptInput = z.infer<typeof rejectReceiptSchema>;

const booleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');
const filterDateSchema = z
  .union([
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (value) =>
          Number.isFinite(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value,
        'Invalid calendar date'
      ),
    z.string().datetime({ offset: true }),
  ])
  .transform((value) => new Date(value));

// List Receipts Query Schema
export const listReceiptsQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    expenseId: z.string().uuid().optional(),
    status: z.nativeEnum(ReceiptStatus).optional(),
    receiptType: z.nativeEnum(ReceiptType).optional(),
    isLinked: booleanQuerySchema.optional(),
    isDeleted: booleanQuerySchema.optional(),
    fromDate: filterDateSchema.optional(),
    toDate: filterDateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce
      .number()
      .int()
      .min(0)
      .max(2147483647)
      .optional()
      .default(0),
  })
  .refine(
    (value) =>
      !value.fromDate || !value.toDate || value.fromDate <= value.toDate,
    { message: 'fromDate must not be after toDate', path: ['toDate'] }
  );

export type ListReceiptsQuery = z.infer<typeof listReceiptsQuerySchema>;
export const receiptPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(2147483647).default(0),
});
export const receiptPaginationQueryJsonSchema = toJsonSchema(
  receiptPaginationQuerySchema
);

// Delete Receipt Query Schema
export const deleteReceiptQuerySchema = z.object({
  permanent: booleanQuerySchema.optional().default('false'),
});

export type DeleteReceiptQuery = z.infer<typeof deleteReceiptQuerySchema>;

// Response schemas
export const receiptResponseSchema = z.object({
  receiptId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  expenseId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  fileName: z.string(),
  originalName: z.string(),
  filePath: z.string(),
  fileSize: z.number().int(),
  mimeType: z.string(),
  fileHash: z.string().optional().nullable(),
  receiptType: z.string(),
  status: z.string(),
  storageProvider: z.string(),
  storageBucket: z.string().optional().nullable(),
  storageKey: z.string().optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
  ocrText: z.string().optional().nullable(),
  ocrConfidence: z.string().optional().nullable(),
  processedAt: z.string().optional().nullable(),
  failureReason: z.string().optional().nullable(),
  isLinked: z.boolean(),
  isDeleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional().nullable(),
});

export const receiptStatsResponseSchema = z.object({
  total: z.number().int(),
  pending: z.number().int(),
  processing: z.number().int(),
  processed: z.number().int(),
  failed: z.number().int(),
  verified: z.number().int(),
  rejected: z.number().int(),
});

// Pre-computed JSON schemas
export const uploadReceiptBodyJsonSchema = toJsonSchema(uploadReceiptSchema);
export const linkToExpenseBodyJsonSchema = toJsonSchema(linkToExpenseSchema);
export const processReceiptBodyJsonSchema = toJsonSchema(processReceiptSchema);
export const rejectReceiptBodyJsonSchema = toJsonSchema(rejectReceiptSchema);
export const listReceiptsQueryJsonSchema = toJsonSchema(
  listReceiptsQuerySchema
);
export const deleteReceiptQueryJsonSchema = toJsonSchema(
  deleteReceiptQuerySchema
);

// Response envelopes
export const receiptEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: receiptResponseSchema,
  })
);

export const receiptListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(receiptResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const receiptStatsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: receiptStatsResponseSchema,
  })
);
