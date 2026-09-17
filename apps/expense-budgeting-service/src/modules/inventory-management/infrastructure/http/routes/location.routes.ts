import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LocationController } from '../controllers/location.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createLocationSchema,
  updateLocationSchema,
  listQuerySchema,
  workspaceParamsJsonSchema,
  locationParamsJsonSchema,
  createLocationBodyJsonSchema,
  updateLocationBodyJsonSchema,
  listQueryJsonSchema,
  locationEnvelopeJsonSchema,
  paginatedLocationsEnvelopeJsonSchema,
} from '../validation/inventory.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function locationRoutes(
  fastify: FastifyInstance,
  controller: LocationController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createLocationSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Create a new location',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createLocationBodyJsonSchema,
        response: {
          201: locationEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Location'],
        description: 'List all locations in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listQueryJsonSchema,
        response: {
          200: paginatedLocationsEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Get location by ID',
        security: [{ bearerAuth: [] }],
        params: locationParamsJsonSchema,
        response: {
          200: locationEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateLocationSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Update location',
        security: [{ bearerAuth: [] }],
        params: locationParamsJsonSchema,
        body: updateLocationBodyJsonSchema,
        response: {
          200: locationEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Location'],
        description: 'Delete location',
        security: [{ bearerAuth: [] }],
        params: locationParamsJsonSchema,
        response: {
          204: noContentResponse,
        },
      },
    },
    (request, reply) =>
      controller.deleteLocation(request as AuthenticatedRequest, reply)
  );
}
