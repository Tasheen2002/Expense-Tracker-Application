import { z } from 'zod'

// Add Metadata Schema
export const addMetadataSchema = z.object({
  merchantName: z.string().min(1).max(255).optional(),
  merchantAddress: z.string().max(500).optional(),
  merchantPhone: z.string().max(50).optional(),
  merchantTaxId: z.string().max(50).optional(),
  transactionDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid transaction date format',
    })
    .transform((val) => (val ? new Date(val) : undefined)),
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
})

export type AddMetadataInput = z.infer<typeof addMetadataSchema>

// Update Metadata Schema (all fields optional)
export const updateMetadataSchema = z.object({
  merchantName: z.string().min(1).max(255).optional(),
  merchantAddress: z.string().max(500).optional(),
  merchantPhone: z.string().max(50).optional(),
  merchantTaxId: z.string().max(50).optional(),
  transactionDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid transaction date format',
    })
    .transform((val) => (val ? new Date(val) : undefined)),
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
})

export type UpdateMetadataInput = z.infer<typeof updateMetadataSchema>
