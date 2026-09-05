import { z } from 'zod';
import { toJsonSchema } from './validator';

// Add Metadata Schema
export const addMetadataSchema = z.object({
  merchantName: z.string().min(1).max(255).optional(),
  merchantAddress: z.string().max(500).optional(),
  merchantPhone: z.string().max(50).optional(),
  merchantTaxId: z.string().max(50).optional(),
  transactionDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parsed = Date.parse(val);
      return isNaN(parsed) ? undefined : new Date(parsed);
    }),
  transactionTime: z.string().max(20).optional(),
  subtotal: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Subtotal must be non-negative' })
    .optional(),
  taxAmount: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Tax amount must be non-negative' })
    .optional(),
  tipAmount: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Tip amount must be non-negative' })
    .optional(),
  totalAmount: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Total amount must be non-negative' })
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .toUpperCase()
    .optional(),
  paymentMethod: z.string().max(50).optional(),
  lastFourDigits: z
    .string()
    .length(4, 'Last four digits must be exactly 4 characters')
    .optional(),
  invoiceNumber: z.string().max(100).optional(),
  poNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export type AddMetadataInput = z.infer<typeof addMetadataSchema>;

// Update Metadata Schema (all fields optional)
export const updateMetadataSchema = z.object({
  merchantName: z.string().min(1).max(255).optional(),
  merchantAddress: z.string().max(500).optional(),
  merchantPhone: z.string().max(50).optional(),
  merchantTaxId: z.string().max(50).optional(),
  transactionDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parsed = Date.parse(val);
      return isNaN(parsed) ? undefined : new Date(parsed);
    }),
  transactionTime: z.string().max(20).optional(),
  subtotal: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Subtotal must be non-negative' })
    .optional(),
  taxAmount: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Tax amount must be non-negative' })
    .optional(),
  tipAmount: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Tip amount must be non-negative' })
    .optional(),
  totalAmount: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, { message: 'Total amount must be non-negative' })
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .toUpperCase()
    .optional(),
  paymentMethod: z.string().max(50).optional(),
  lastFourDigits: z
    .string()
    .length(4, 'Last four digits must be exactly 4 characters')
    .optional(),
  invoiceNumber: z.string().max(100).optional(),
  poNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateMetadataInput = z.infer<typeof updateMetadataSchema>;

// Response schemas
export const receiptMetadataResponseSchema = z.object({
  metadataId: z.string().uuid(),
  receiptId: z.string().uuid(),
  merchantName: z.string().optional().nullable(),
  merchantAddress: z.string().optional().nullable(),
  merchantPhone: z.string().optional().nullable(),
  merchantTaxId: z.string().optional().nullable(),
  transactionDate: z.string().optional().nullable(),
  transactionTime: z.string().optional().nullable(),
  subtotal: z.string().optional().nullable(),
  taxAmount: z.string().optional().nullable(),
  tipAmount: z.string().optional().nullable(),
  totalAmount: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  lastFourDigits: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  poNumber: z.string().optional().nullable(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    amount: z.number(),
  })).optional().nullable(),
  notes: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Pre-computed JSON schemas
export const addMetadataBodyJsonSchema = toJsonSchema(addMetadataSchema);
export const updateMetadataBodyJsonSchema = toJsonSchema(updateMetadataSchema);

// Response envelopes
export const receiptMetadataEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: receiptMetadataResponseSchema,
  })
);
