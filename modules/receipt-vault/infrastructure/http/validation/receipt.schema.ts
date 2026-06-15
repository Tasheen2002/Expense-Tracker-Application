import { z } from "zod";
import { toJsonSchema } from "./validator";
import {
  MAX_FILE_SIZE,
  MIN_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  MIN_OCR_CONFIDENCE,
  MAX_OCR_CONFIDENCE,
} from "../../../domain/constants/receipt.constants";
import { ReceiptStatus } from "../../../domain/enums/receipt-status";
import { ReceiptType } from "../../../domain/enums/receipt-type";
import { StorageProvider } from "../../../domain/enums/storage-provider";

// Upload Receipt Schema
export const uploadReceiptSchema = z.object({
  fileName: z.string().min(1, "File name is required").max(255),
  originalName: z.string().min(1, "Original name is required").max(255),
  filePath: z.string().min(1, "File path is required").max(1000),
  fileSize: z
    .number()
    .int()
    .min(MIN_FILE_SIZE, `File size must be at least ${MIN_FILE_SIZE} bytes`)
    .max(
      MAX_FILE_SIZE,
      `File size cannot exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    ),
  mimeType: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val), {
    message: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`,
  }),
  fileHash: z.string().optional(),
  receiptType: z.nativeEnum(ReceiptType).optional(),
  storageProvider: z.nativeEnum(StorageProvider),
  storageBucket: z.string().optional(),
  storageKey: z.string().optional(),
});

export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;

// Link to Expense Schema
export const linkToExpenseSchema = z.object({
  expenseId: z.string().uuid("Invalid expense ID format"),
});

export type LinkToExpenseInput = z.infer<typeof linkToExpenseSchema>;

// Process Receipt Schema
export const processReceiptSchema = z.object({
  ocrText: z.string().optional(),
  ocrConfidence: z
    .number()
    .min(
      MIN_OCR_CONFIDENCE,
      `OCR confidence must be at least ${MIN_OCR_CONFIDENCE}`,
    )
    .max(
      MAX_OCR_CONFIDENCE,
      `OCR confidence cannot exceed ${MAX_OCR_CONFIDENCE}`,
    )
    .optional(),
});

export type ProcessReceiptInput = z.infer<typeof processReceiptSchema>;

// Reject Receipt Schema
export const rejectReceiptSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(500).optional(),
});

export type RejectReceiptInput = z.infer<typeof rejectReceiptSchema>;

// List Receipts Query Schema
export const listReceiptsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  expenseId: z.string().uuid().optional(),
  status: z.nativeEnum(ReceiptStatus).optional(),
  receiptType: z.nativeEnum(ReceiptType).optional(),
  isLinked: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  isDeleted: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  fromDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  toDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .refine((val) => val >= 0, {
      message: "Offset must be greater than or equal to 0",
    }),
});

export type ListReceiptsQuery = z.infer<typeof listReceiptsQuerySchema>;

// Delete Receipt Query Schema
export const deleteReceiptQuerySchema = z.object({
  permanent: z
    .string()
    .optional()
    .transform((val) => val === "true"),
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
});

// Pre-computed JSON schemas
export const uploadReceiptBodyJsonSchema = toJsonSchema(uploadReceiptSchema);
export const linkToExpenseBodyJsonSchema = toJsonSchema(linkToExpenseSchema);
export const processReceiptBodyJsonSchema = toJsonSchema(processReceiptSchema);
export const rejectReceiptBodyJsonSchema = toJsonSchema(rejectReceiptSchema);
export const listReceiptsQueryJsonSchema = toJsonSchema(listReceiptsQuerySchema);
export const deleteReceiptQueryJsonSchema = toJsonSchema(deleteReceiptQuerySchema);

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
