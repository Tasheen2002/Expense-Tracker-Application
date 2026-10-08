import { notificationReadRateLimit, notificationWriteRateLimit } from '@shared/http/notification-rate-limits';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PreferenceController } from '../controllers/preference.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { validateBody, validateQuery, validateParams } from '../validation/validator';
import {
  updateGlobalPreferencesSchema, workspaceParamsSchema, preferenceTypeParamsSchema,
  updateTypePreferenceSchema,
  checkChannelEnabledSchema,
  workspaceParamsJsonSchema,
  preferenceTypeParamsJsonSchema,
  updateGlobalPreferencesBodyJsonSchema,
  updateTypePreferenceBodyJsonSchema,
  checkChannelEnabledQueryJsonSchema,
  notificationPreferenceEnvelopeJsonSchema,
  checkChannelEnabledEnvelopeJsonSchema,
} from '../validation/template.schema';

export async function registerPreferenceRoutes(
  fastify: FastifyInstance,
  controller: Pick<PreferenceController, 'getPreferences' | 'updateGlobalPreferences' | 'updateTypePreference' | 'checkChannelEnabled'>
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  // Get user preferences for a workspace
  fastify.get(
    '/workspaces/:workspaceId/notification-preferences',
    {
      onRequest: [fastify.authenticate, notificationReadRateLimit],
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Notification Preferences'],
        description: 'Get notification preferences for the current user in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: notificationPreferenceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getPreferences(request as AuthenticatedRequest, reply)
  );

  // Update global notification preferences
  fastify.patch(
    '/workspaces/:workspaceId/notification-preferences',
    {
      onRequest: [fastify.authenticate, notificationWriteRateLimit],
      preValidation: [validateParams(workspaceParamsSchema), validateBody(updateGlobalPreferencesSchema)],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Notification Preferences'],
        description: 'Update global notification preferences',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: updateGlobalPreferencesBodyJsonSchema,
        response: {
          200: notificationPreferenceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateGlobalPreferences(request as AuthenticatedRequest, reply)
  );

  // Update notification preference for a specific type
  fastify.patch(
    '/workspaces/:workspaceId/notification-preferences/:type',
    {
      onRequest: [fastify.authenticate, notificationWriteRateLimit],
      preValidation: [validateParams(preferenceTypeParamsSchema), validateBody(updateTypePreferenceSchema)],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Notification Preferences'],
        description: 'Update notification preferences for a specific notification type',
        security: [{ bearerAuth: [] }],
        params: preferenceTypeParamsJsonSchema,
        body: updateTypePreferenceBodyJsonSchema,
        response: {
          200: notificationPreferenceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateTypePreference(request as AuthenticatedRequest, reply)
  );

  // Check if a channel is enabled for a notification type
  fastify.get(
    '/workspaces/:workspaceId/notification-preferences/check',
    {
      onRequest: [fastify.authenticate, notificationReadRateLimit],
      preValidation: [validateParams(workspaceParamsSchema), validateQuery(checkChannelEnabledSchema)],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Notification Preferences'],
        description: 'Check if a specific channel is enabled for a notification type',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: checkChannelEnabledQueryJsonSchema,
        response: {
          200: checkChannelEnabledEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.checkChannelEnabled(request as AuthenticatedRequest, reply)
  );
}
