import { z } from 'zod';
import { toJsonSchema } from './validator';
import { SplitType } from '../../../domain/enums/split-type';
import { SettlementStatus } from '../../../domain/enums/settlement-status';

/**
 * Create Split Schema
 */
export const createSplitSchema = z.object({
  splitType: z.nativeEnum(SplitType),
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
  status: z.nativeEnum(SettlementStatus).optional(),
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

export const createSplitBodyJsonSchema = toJsonSchema(createSplitSchema);
export const recordSettlementPaymentBodyJsonSchema = toJsonSchema(recordSettlementPaymentSchema);
export const listSettlementsQueryJsonSchema = toJsonSchema(listSettlementsQuerySchema);
export const splitParamsJsonSchema = toJsonSchema(splitParamsSchema);
export const settlementParamsJsonSchema = toJsonSchema(settlementParamsSchema);

// ==================== RESPONSE SCHEMAS ====================

export const participantResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  shareAmount: z.string(),
  sharePercentage: z.number().nullable().optional(),
  isPaid: z.boolean(),
  paidAt: z.string().nullable().optional(),
});

export const splitResponseSchema = z.object({
  id: z.string().uuid(),
  expenseId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  paidBy: z.string().uuid(),
  totalAmount: z.string(),
  currency: z.string(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']),
  participants: z.array(participantResponseSchema),
  isFullySettled: z.boolean(),
  outstandingAmount: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const settlementResponseSchema = z.object({
  id: z.string().uuid(),
  splitId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  totalOwedAmount: z.string(),
  paidAmount: z.string(),
  remainingAmount: z.string(),
  currency: z.string(),
  status: z.enum(['PENDING', 'PARTIAL', 'SETTLED']),
  settledAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==================== ENVELOPE JSON SCHEMAS ====================

export const splitEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: splitResponseSchema,
  })
);

export const paginatedSplitsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(splitResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const settlementEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: settlementResponseSchema,
  })
);

export const paginatedSettlementsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(settlementResponseSchema),
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

