import { z } from 'zod';

/**
 * Create Split Schema
 */
export const createSplitSchema = z.object({
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']),
  participants: z
    .array(
      z.object({
        userId: z.string().uuid('Invalid user ID format'),
        shareAmount: z.number().min(0.01).optional(),
        sharePercentage: z.number().min(0).max(100).optional(),
      })
    )
    .min(2, 'At least 2 participants are required'),
});

export type CreateSplitInput = z.infer<typeof createSplitSchema>;

/**
 * Record Settlement Payment Schema
 */
export const recordSettlementPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be at least 0.01'),
});

export type RecordSettlementPaymentInput = z.infer<typeof recordSettlementPaymentSchema>;

/**
 * List Settlements Query Schema
 */
export const listSettlementsQuerySchema = z.object({
  status: z.enum(['PENDING', 'PARTIAL', 'SETTLED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListSettlementsQuery = z.infer<typeof listSettlementsQuerySchema>;

/**
 * Split Params Schema
 */
export const splitParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  splitId: z.string().uuid('Invalid split ID format'),
});

/**
 * Settlement Params Schema
 */
export const settlementParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  settlementId: z.string().uuid('Invalid settlement ID format'),
});
