import { z } from "zod";
import { ACCESS_TOKEN_EXPIRY_DAYS } from "../../../domain/constants/bank-feed-sync.constants";

/**
 * Create Bank Connection Schema
 */
export const createBankConnectionSchema = z.object({
  institutionId: z.string().min(1, "Institution ID is required"),
  institutionName: z.string().min(1, "Institution name is required"),
  accountId: z.string().min(1, "Account ID is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.string().min(1, "Account type is required"),
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  accessToken: z.string().min(1, "Access token is required"),
  accountMask: z.string().optional(),
  tokenExpiresAt: z.string().datetime("Invalid date format").optional(),
});

export type CreateBankConnectionInput = z.infer<
  typeof createBankConnectionSchema
>;

/**
 * Update Connection Token Schema
 */
export const updateConnectionTokenSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
  tokenExpiresAt: z.string().datetime("Invalid date format").optional(),
});

export type UpdateConnectionTokenInput = z.infer<
  typeof updateConnectionTokenSchema
>;

/**
 * Connection ID Param Schema
 */
export const connectionIdParamSchema = z.object({
  connectionId: z.string().uuid("Invalid connection ID"),
});

export type ConnectionIdParam = z.infer<typeof connectionIdParamSchema>;

/**
 * Get Bank Connections Query Schema
 */
export const getBankConnectionsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
});

export type GetBankConnectionsQuery = z.infer<
  typeof getBankConnectionsQuerySchema
>;
