import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SupplierController } from '../controllers/supplier.controller';
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
  createSupplierSchema,
  updateSupplierSchema,
  listQuerySchema,
  workspaceParamsJsonSchema,
  supplierParamsJsonSchema,
  createSupplierBodyJsonSchema,
  updateSupplierBodyJsonSchema,
  listQueryJsonSchema,
  supplierEnvelopeJsonSchema,
  paginatedSuppliersEnvelopeJsonSchema,
} from '../validation/inventory.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function supplierRoutes(
  fastify: FastifyInstance,
  controller: SupplierController
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

  // Create supplier
  fastify.post(
    '/workspaces/:workspaceId/suppliers',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createSupplierSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Create a new supplier',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createSupplierBodyJsonSchema,
        response: {
          201: supplierEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createSupplier(request as AuthenticatedRequest, reply)
  );

  // List suppliers
  fastify.get(
    '/workspaces/:workspaceId/suppliers',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'List all suppliers in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listQueryJsonSchema,
        response: {
          200: paginatedSuppliersEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listSuppliers(request as AuthenticatedRequest, reply)
  );

  // Get supplier by ID
  fastify.get(
    '/workspaces/:workspaceId/suppliers/:supplierId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Get supplier by ID',
        security: [{ bearerAuth: [] }],
        params: supplierParamsJsonSchema,
        response: {
          200: supplierEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getSupplier(request as AuthenticatedRequest, reply)
  );

  // Update supplier
  fastify.patch(
    '/workspaces/:workspaceId/suppliers/:supplierId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateSupplierSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Update supplier',
        security: [{ bearerAuth: [] }],
        params: supplierParamsJsonSchema,
        body: updateSupplierBodyJsonSchema,
        response: {
          200: supplierEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateSupplier(request as AuthenticatedRequest, reply)
  );

  // Delete supplier
  fastify.delete(
    '/workspaces/:workspaceId/suppliers/:supplierId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Delete supplier',
        security: [{ bearerAuth: [] }],
        params: supplierParamsJsonSchema,
        response: {
          204: noContentResponse,
        },
      },
    },
    (request, reply) =>
      controller.deleteSupplier(request as AuthenticatedRequest, reply)
  );
}
