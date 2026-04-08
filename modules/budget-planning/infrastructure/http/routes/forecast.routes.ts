import { FastifyInstance } from 'fastify';
import { ForecastController } from '../controllers/forecast.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';
import { validateBody, validateParams } from '../validation/validator';
import {
  planIdParamsSchema,
  forecastParamsSchema,
  forecastIdParamsSchema,
  forecastItemParamsSchema,
  createForecastSchema,
  addForecastItemSchema,
  forecastResponseSchema,
  paginatedForecastsResponseSchema,
  paginatedForecastItemsResponseSchema,
} from '../validation/budget-planning.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function forecastRoutes(
  fastify: FastifyInstance,
  controller: ForecastController
) {
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
      preValidation: [validateParams(planIdParamsSchema)],
      preHandler: [
        validateBody(createForecastSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'Create a new forecast for a budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'planId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            planId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            type: {
              type: 'string',
              enum: ['BASELINE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM'],
            },
          },
        },
        response: {
          201: {
            description: 'Forecast created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  forecastId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
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
      preValidation: [validateParams(planIdParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'List all forecasts for a budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'planId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            planId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Forecasts retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: paginatedForecastsResponseSchema,
            },
          },
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
      preValidation: [validateParams(forecastParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'Get a specific forecast',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Forecast retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: forecastResponseSchema,
            },
          },
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
      preValidation: [validateParams(forecastParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Budget Planning - Forecasts'],
        description: 'Delete a forecast',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
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
      preValidation: [validateParams(forecastIdParamsSchema)],
      preHandler: [
        validateBody(addForecastItemSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Budget Planning - Forecast Items'],
        description: 'Add an item to a forecast',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'forecastId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            forecastId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['categoryId', 'amount'],
          properties: {
            categoryId: { type: 'string', format: 'uuid' },
            amount: { type: 'number', minimum: 0 },
            notes: { type: 'string', maxLength: 500 },
          },
        },
        response: {
          201: {
            description: 'Forecast item added successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  forecastItemId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
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
      preValidation: [validateParams(forecastIdParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Budget Planning - Forecast Items'],
        description: 'List all items in a forecast',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'forecastId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            forecastId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Forecast items retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: paginatedForecastItemsResponseSchema,
            },
          },
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
      preValidation: [validateParams(forecastItemParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Budget Planning - Forecast Items'],
        description: 'Delete a forecast item',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'itemId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            itemId: { type: 'string', format: 'uuid' },
          },
        },
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
