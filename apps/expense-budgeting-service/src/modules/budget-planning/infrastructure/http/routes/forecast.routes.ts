import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ForecastController } from '../controllers/forecast.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { validateBody } from '../validation/validator';
import {
  createForecastSchema,
  addForecastItemSchema,
  planIdParamsJsonSchema,
  forecastParamsJsonSchema,
  forecastIdParamsJsonSchema,
  forecastItemParamsJsonSchema,
  createForecastBodyJsonSchema,
  addForecastItemBodyJsonSchema,
  forecastEnvelopeJsonSchema,
  paginatedForecastsEnvelopeJsonSchema,
  forecastItemEnvelopeJsonSchema,
  paginatedForecastItemsEnvelopeJsonSchema,
} from '../validation/budget-planning.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function forecastRoutes(
  fastify: FastifyInstance,
  controller: ForecastController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // ==========================================
  // Forecast Routes
  // ==========================================

  // Create forecast
  fastify.post(
    '/workspaces/:workspaceId/budget-plans/:planId/forecasts',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createForecastSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'Create a new forecast for a budget plan',
        security: [{ bearerAuth: [] }],
        params: planIdParamsJsonSchema,
        body: createForecastBodyJsonSchema,
        response: {
          201: forecastEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.create(request as AuthenticatedRequest, reply)
  );

  // List forecasts for a plan
  fastify.get(
    '/workspaces/:workspaceId/budget-plans/:planId/forecasts',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'List all forecasts for a budget plan',
        security: [{ bearerAuth: [] }],
        params: planIdParamsJsonSchema,
        response: {
          200: paginatedForecastsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.list(request as AuthenticatedRequest, reply)
  );

  // Get single forecast
  fastify.get(
    '/workspaces/:workspaceId/forecasts/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'Get a specific forecast',
        security: [{ bearerAuth: [] }],
        params: forecastParamsJsonSchema,
        response: {
          200: forecastEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.get(request as AuthenticatedRequest, reply)
  );

  // Delete forecast
  fastify.delete(
    '/workspaces/:workspaceId/forecasts/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'Delete a forecast',
        security: [{ bearerAuth: [] }],
        params: forecastParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'Forecast deleted successfully',
          },
        },
      },
    },
    (request, reply) =>
      controller.delete(request as AuthenticatedRequest, reply)
  );

  // ==========================================
  // Forecast Item Routes
  // ==========================================

  // Add forecast item
  fastify.post(
    '/workspaces/:workspaceId/forecasts/:forecastId/items',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(addForecastItemSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Forecast Items'],
        description: 'Add an item to a forecast',
        security: [{ bearerAuth: [] }],
        params: forecastIdParamsJsonSchema,
        body: addForecastItemBodyJsonSchema,
        response: {
          201: forecastItemEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.addItem(request as AuthenticatedRequest, reply)
  );

  // List forecast items
  fastify.get(
    '/workspaces/:workspaceId/forecasts/:forecastId/items',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget Planning - Forecast Items'],
        description: 'List all items in a forecast',
        security: [{ bearerAuth: [] }],
        params: forecastIdParamsJsonSchema,
        response: {
          200: paginatedForecastItemsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listItems(request as AuthenticatedRequest, reply)
  );

  // Delete forecast item
  fastify.delete(
    '/workspaces/:workspaceId/forecast-items/:itemId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Forecast Items'],
        description: 'Delete a forecast item',
        security: [{ bearerAuth: [] }],
        params: forecastItemParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'Forecast item deleted successfully',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteItem(request as AuthenticatedRequest, reply)
  );
}
