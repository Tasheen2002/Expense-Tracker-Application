import { FastifyInstance } from 'fastify';
import { LocationController } from '../controllers/location.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { requireRole } from '@shared/middleware/role-authorization.middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  createLocationSchema,
  updateLocationSchema,
  workspaceParamsSchema,
  locationParamsSchema,
  listQuerySchema,
} from '../validation/inventory.schema';

const locationSchema = {
  type: 'object',
  properties: {
    locationId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['WAREHOUSE', 'STORE', 'OTHER'] },
    address: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function locationRoutes(
  fastify: FastifyInstance,
  controller: LocationController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create location
  fastify.post(
    '/workspaces/:workspaceId/locations',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateBody(createLocationSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Create a new location',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            type: { type: 'string', enum: ['WAREHOUSE', 'STORE', 'OTHER'] },
            address: { type: 'string', nullable: true },
          },
        },
        response: {
          201: {
            description: 'Location created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: locationSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createLocation(request as AuthenticatedRequest, reply)
  );

  // List locations
  fastify.get(
    '/workspaces/:workspaceId/locations',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateQuery(listQuerySchema),
        requireRole(['owner', 'admin', 'manager', 'viewer']),
      ],
      schema: {
        tags: ['Inventory - Location'],
        description: 'List all locations in workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Locations retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: locationSchema },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listLocations(request as AuthenticatedRequest, reply)
  );

  // Get location by ID
  fastify.get(
    '/workspaces/:workspaceId/locations/:locationId',
    {
      preValidation: [validateParams(locationParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Get location by ID',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Location retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: locationSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getLocation(request as AuthenticatedRequest, reply)
  );

  // Update location
  fastify.patch(
    '/workspaces/:workspaceId/locations/:locationId',
    {
      preValidation: [validateParams(locationParamsSchema)],
      preHandler: [
        validateBody(updateLocationSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Update location',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            type: { type: 'string', enum: ['WAREHOUSE', 'STORE', 'OTHER'] },
            address: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Location updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: locationSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateLocation(request as AuthenticatedRequest, reply)
  );

  // Delete location
  fastify.delete(
    '/workspaces/:workspaceId/locations/:locationId',
    {
      preValidation: [validateParams(locationParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Delete location',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'No Content',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteLocation(request as AuthenticatedRequest, reply)
  );
}
