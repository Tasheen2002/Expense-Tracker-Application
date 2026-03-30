import { z } from "zod";
import { TransactionStatus } from "../../../domain/enums/transaction-status.enum";

/**
 * Process Transaction Schema
 */
export const processTransactionSchema = z.object({
  action: z.enum(["import", "match", "ignore"], {
    errorMap: () => ({ message: "Action must be: import, match, or ignore" }),
  }),
  expenseId: z.string().uuid("Invalid expense ID").optional(),
});

export type ProcessTransactionInput = z.infer<typeof processTransactionSchema>;

/**
 * Transaction ID Param Schema
 */
export const transactionIdParamSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
});

export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;

/**
 * Get Pending Transactions Query Schema
 */
export const pendingTransactionsQuerySchema = z.object({
  connectionId: z.string().uuid("Invalid connection ID").optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type PendingTransactionsQuery = z.infer<
  typeof pendingTransactionsQuerySchema
>;
