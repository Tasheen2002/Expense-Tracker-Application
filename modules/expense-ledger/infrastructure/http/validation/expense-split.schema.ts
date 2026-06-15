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

