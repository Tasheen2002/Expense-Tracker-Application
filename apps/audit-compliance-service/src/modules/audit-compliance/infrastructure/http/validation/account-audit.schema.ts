import { z } from 'zod';
export const accountAuditQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(2147483647).default(0),
  })
  .strict();
export type AccountAuditQuery = z.infer<typeof accountAuditQuerySchema>;
export const accountAuditListResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.literal(200),
  message: z.string(),
  data: z.object({
    items: z.array(
      z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
        scope: z.literal('account'),
        eventType: z.string(),
        entityType: z.string(),
        entityId: z.string().uuid(),
        details: z.record(z.unknown()),
        createdAt: z.string().datetime(),
      })
    ),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
});
