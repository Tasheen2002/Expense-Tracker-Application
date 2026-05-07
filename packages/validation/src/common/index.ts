import { z } from "zod";

/**
 * Canonical pagination input — matches the backend's `paginationQuerySchema`
 * exposed at `apps/api/src/shared/http/validation.ts`. Frontend list pages
 * should consume this for query string parsing so client and server agree
 * on bounds.
 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Canonical paginated-response shape — mirrors `PaginatedResult<T>` from
 * `packages/core/src/domain/interfaces/paginated-result.interface.ts`.
 *
 * Use this builder when defining response schemas for list endpoints so
 * the wire shape stays consistent across modules.
 */
export const paginatedResponseShape = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  });
