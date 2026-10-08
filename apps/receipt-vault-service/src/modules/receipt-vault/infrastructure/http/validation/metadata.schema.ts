import { z } from 'zod';
import Decimal from 'decimal.js';

const amountSchema = z.union([z.number(), z.string().regex(/^\d+(?:\.\d{1,2})?$/).transform(Number)])
  .refine(value => Number.isFinite(value) && value >= 0 && value <= 9999999999.99 && new Decimal(value).decimalPlaces() <= 2, 'Expected a bounded nonnegative amount with at most two decimals');
const dateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Invalid calendar date'),
  z.string().datetime({ offset: true }),
]).transform(value => new Date(value));
import { toJsonSchema } from './validator';

// Add Metadata Schema
export const addMetadataSchema = z.object({
  merchantName: z.string().min(1).max(255).optional(),
  merchantAddress: z.string().max(500).optional(),
  merchantPhone: z.string().max(50).optional(),
  merchantTaxId: z.string().max(50).optional(),
  transactionDate: dateSchema.optional(),
  transactionTime: z.string().max(20).optional(),
  subtotal: amountSchema.optional(),
  taxAmount: amountSchema.optional(),
  tipAmount: amountSchema.optional(),
  totalAmount: amountSchema.optional(),
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
  notes: z.string().max(5000).optional(),
});

export type AddMetadataInput = z.infer<typeof addMetadataSchema>;

// Update Metadata Schema (all fields optional)
export const updateMetadataSchema = addMetadataSchema;

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
