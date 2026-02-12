import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const workspaceIdSchema = z.string().uuid();

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type WorkspaceId = z.infer<typeof workspaceIdSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
