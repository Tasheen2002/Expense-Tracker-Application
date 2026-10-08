import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { AccountNotificationController } from '../controllers/account-notification.controller';
import {
  accountNotificationQuerySchema,
  accountNotificationParamsSchema,
  accountPreferenceSchema,
  AccountNotificationQuery,
  AccountPreferenceBody,
  AccountNotificationParams,
  accountNotificationListResponseSchema,
  accountPreferenceResponseSchema,
  accountMutationResponseSchema,
} from '../validation/account-notification.schema';
import {
  notificationReadRateLimit,
  notificationWriteRateLimit,
} from '@shared/http/notification-rate-limits';
import {
  validateQuery,
  validateBody,
  validateParams,
  toJsonSchema,
} from '../validation/validator';
export async function accountNotificationRoutes(
  app: FastifyInstance,
  controller: AccountNotificationController
): Promise<void> {
  app.get(
    '/account/notifications',
    {
      onRequest: [app.authenticate, notificationReadRateLimit],
      preValidation: [validateQuery(accountNotificationQuerySchema)],
      schema: {
        tags: ['Account Notification'],
        summary: 'List own account notifications',
        security: [{ bearerAuth: [] }],
        querystring: toJsonSchema(accountNotificationQuerySchema),
        response: { 200: toJsonSchema(accountNotificationListResponseSchema) },
      },
    },
    (request, reply) =>
      controller.list(
        request as AuthenticatedRequest<{
          Querystring: AccountNotificationQuery;
        }>,
        reply
      )
  );
  app.patch(
    '/account/notifications/:notificationId/read',
    {
      onRequest: [app.authenticate, notificationWriteRateLimit],
      preValidation: [validateParams(accountNotificationParamsSchema)],
      schema: {
        tags: ['Account Notification'],
        summary: 'Mark own account notification as read',
        security: [{ bearerAuth: [] }],
        params: toJsonSchema(accountNotificationParamsSchema),
        response: { 200: toJsonSchema(accountMutationResponseSchema) },
      },
    },
    (request, reply) =>
      controller.markRead(
        request as AuthenticatedRequest<{ Params: AccountNotificationParams }>,
        reply
      )
  );
  app.get(
    '/account/notification-preferences',
    {
      onRequest: [app.authenticate, notificationReadRateLimit],
      schema: {
        tags: ['Account Notification'],
        summary: 'Get own account notification preferences',
        security: [{ bearerAuth: [] }],
        response: { 200: toJsonSchema(accountPreferenceResponseSchema) },
      },
    },
    (request, reply) =>
      controller.getPreferences(request as AuthenticatedRequest, reply)
  );
  app.put(
    '/account/notification-preferences',
    {
      onRequest: [app.authenticate, notificationWriteRateLimit],
      preValidation: [validateBody(accountPreferenceSchema)],
      schema: {
        tags: ['Account Notification'],
        summary: 'Replace own account notification preferences',
        security: [{ bearerAuth: [] }],
        body: toJsonSchema(accountPreferenceSchema),
        response: { 200: toJsonSchema(accountMutationResponseSchema) },
      },
    },
    (request, reply) =>
      controller.setPreferences(
        request as AuthenticatedRequest<{ Body: AccountPreferenceBody }>,
        reply
      )
  );
}
