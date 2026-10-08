import { z } from 'zod';
import { ACCOUNT_NOTIFICATION_MESSAGES } from '../../../domain/entities/account-notification.entity';
import { NotificationId } from '../../../domain/value-objects';
export const accountNotificationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(2147483647).default(0),
  })
  .strict();
export const accountNotificationParamsSchema = z
  .object({ notificationId: z.string().uuid().refine(NotificationId.isValid) })
  .strict();
export const accountPreferenceSchema = z
  .object({
    inAppEnabled: z.boolean(),
    typeSettings: z
      .record(z.boolean())
      .refine(
        (settings) =>
          Object.keys(settings).every((key) =>
            Object.prototype.hasOwnProperty.call(
              ACCOUNT_NOTIFICATION_MESSAGES,
              key
            )
          ),
        'Unsupported account event preference'
      )
      .default({}),
  })
  .strict();
export type AccountNotificationQuery = z.infer<
  typeof accountNotificationQuerySchema
>;
export type AccountPreferenceBody = z.infer<typeof accountPreferenceSchema>;
export type AccountNotificationParams = z.infer<
  typeof accountNotificationParamsSchema
>;
export const accountNotificationListResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.literal(200),
  message: z.string(),
  data: z.object({
    items: z.array(
      z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
        eventType: z.string(),
        scope: z.literal('account'),
        channel: z.literal('IN_APP'),
        title: z.string(),
        content: z.string(),
        createdAt: z.string().datetime(),
        readAt: z.string().datetime().nullable(),
      })
    ),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
});
export const accountPreferenceResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.literal(200),
  message: z.string(),
  data: z.object({
    inAppEnabled: z.boolean(),
    typeSettings: z.record(z.boolean()),
  }),
});
export const accountMutationResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.literal(200),
  message: z.string(),
});
