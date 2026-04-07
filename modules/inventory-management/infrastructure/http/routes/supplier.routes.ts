import { FastifyInstance } from 'fastify';
import { SupplierController } from '../controllers/supplier.controller';
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
  createSupplierSchema,
  updateSupplierSchema,
  workspaceParamsSchema,
  supplierParamsSchema,
  listQuerySchema,
} from '../validation/inventory.schema';

const supplierSchema = {
  type: 'object',
  properties: {
    supplierId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string' },
    name: { type: 'string' },
    contactEmail: { type: 'string', nullable: true },
    contactPhone: { type: 'string', nullable: true },
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

export async function supplierRoutes(
  fastify: FastifyInstance,
  controller: SupplierController
) {
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateBody(createSupplierSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Create a new supplier',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            contactEmail: { type: 'string', format: 'email', nullable: true },
            contactPhone: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
          },
        },
        response: {
          201: {
            description: 'Supplier created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: supplierSchema,
            },
          },
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateQuery(listQuerySchema),
        requireRole(['owner', 'admin', 'manager', 'viewer']),
      ],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'List all suppliers in workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Suppliers retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: supplierSchema },
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
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
      preValidation: [validateParams(supplierParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Get supplier by ID',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Supplier retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: supplierSchema,
            },
          },
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
      preValidation: [validateParams(supplierParamsSchema)],
      preHandler: [
        validateBody(updateSupplierSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Update supplier',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            contactEmail: { type: 'string', format: 'email', nullable: true },
            contactPhone: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Supplier updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: supplierSchema,
            },
          },
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
      preValidation: [validateParams(supplierParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Inventory - Supplier'],
        description: 'Delete supplier',
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
      controller.deleteSupplier(request as AuthenticatedRequest, reply)
  );
}
