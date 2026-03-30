import { FastifyInstance } from 'fastify';
import { PolicyController } from '../controllers/policy.controller';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  createPolicySchema,
  updatePolicySchema,
  workspaceParamsSchema,
  policyParamsSchema,
  policyQuerySchema,
} from '../validation/policy.schema';

export async function policyRoutes(
  fastify: FastifyInstance,
  controller: PolicyController
) {
  // Add authentication hook to all routes in this plugin
  fastify.addHook('onRequest', fastify.authenticate);

  const policyResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          policyType: { type: 'string' },
          severity: { type: 'string' },
          configuration: { type: 'object' },
          priority: { type: 'integer' },
          isActive: { type: 'boolean' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  };

  // Create policy
  fastify.post(
    '/workspaces/:workspaceId/policies',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateBody(createPolicySchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Create a new expense policy',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'policyType', 'severity', 'configuration'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            policyType: {
              type: 'string',
              enum: [
                'SPENDING_LIMIT',
                'DAILY_LIMIT',
                'WEEKLY_LIMIT',
                'MONTHLY_LIMIT',
                'CATEGORY_RESTRICTION',
                'MERCHANT_BLACKLIST',
                'TIME_RESTRICTION',
                'RECEIPT_REQUIRED',
                'DESCRIPTION_REQUIRED',
                'APPROVAL_REQUIRED',
              ],
            },
            severity: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            },
            configuration: { type: 'object' },
            priority: { type: 'integer', minimum: 0, maximum: 1000 },
          },
        },
        response: {
          201: policyResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.createPolicy(
        request as Parameters<typeof controller.createPolicy>[0],
        reply
      )
  );

  // List policies
  fastify.get(
    '/workspaces/:workspaceId/policies',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(policyQuerySchema),
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'List all expense policies in workspace',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            activeOnly: { type: 'string', enum: ['true', 'false'] },
            policyType: {
              type: 'string',
              enum: [
                'SPENDING_LIMIT',
                'DAILY_LIMIT',
                'WEEKLY_LIMIT',
                'MONTHLY_LIMIT',
                'CATEGORY_RESTRICTION',
                'MERCHANT_BLACKLIST',
                'TIME_RESTRICTION',
                'RECEIPT_REQUIRED',
                'DESCRIPTION_REQUIRED',
                'APPROVAL_REQUIRED',
              ],
            },
            limit: {
              type: 'string',
              description: 'Number of policies to return',
            },
            offset: {
              type: 'string',
              description: 'Number of policies to skip',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        workspaceId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        policyType: { type: 'string' },
                        severity: { type: 'string' },
                        configuration: { type: 'object' },
                        priority: { type: 'integer' },
                        isActive: { type: 'boolean' },
                        createdBy: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
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
      controller.listPolicies(
        request as Parameters<typeof controller.listPolicies>[0],
        reply
      )
  );

  // Get policy
  fastify.get(
    '/workspaces/:workspaceId/policies/:policyId',
    {
      preValidation: [validateParams(policyParamsSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Get expense policy by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'policyId'],
          properties: {
            workspaceId: { type: 'string' },
            policyId: { type: 'string' },
          },
        },
        response: {
          200: policyResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.getPolicy(
        request as Parameters<typeof controller.getPolicy>[0],
        reply
      )
  );

  // Update policy
  fastify.put(
    '/workspaces/:workspaceId/policies/:policyId',
    {
      preValidation: [validateParams(policyParamsSchema)],
      preHandler: [validateBody(updatePolicySchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Update expense policy',
        params: {
          type: 'object',
          required: ['workspaceId', 'policyId'],
          properties: {
            workspaceId: { type: 'string' },
            policyId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            severity: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            },
            configuration: { type: 'object' },
            priority: { type: 'integer', minimum: 0, maximum: 1000 },
          },
        },
        response: {
          200: policyResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.updatePolicy(
        request as Parameters<typeof controller.updatePolicy>[0],
        reply
      )
  );

  // Delete policy
  fastify.delete(
    '/workspaces/:workspaceId/policies/:policyId',
    {
      preValidation: [validateParams(policyParamsSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Delete expense policy',
        params: {
          type: 'object',
          required: ['workspaceId', 'policyId'],
          properties: {
            workspaceId: { type: 'string' },
            policyId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.deletePolicy(
        request as Parameters<typeof controller.deletePolicy>[0],
        reply
      )
  );

  // Activate policy
  fastify.post(
    '/workspaces/:workspaceId/policies/:policyId/activate',
    {
      preValidation: [validateParams(policyParamsSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Activate expense policy',
        params: {
          type: 'object',
          required: ['workspaceId', 'policyId'],
          properties: {
            workspaceId: { type: 'string' },
            policyId: { type: 'string' },
          },
        },
        response: {
          200: policyResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.activatePolicy(
        request as Parameters<typeof controller.activatePolicy>[0],
        reply
      )
  );

  // Deactivate policy
  fastify.post(
    '/workspaces/:workspaceId/policies/:policyId/deactivate',
    {
      preValidation: [validateParams(policyParamsSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Deactivate expense policy',
        params: {
          type: 'object',
          required: ['workspaceId', 'policyId'],
          properties: {
            workspaceId: { type: 'string' },
            policyId: { type: 'string' },
          },
        },
        response: {
          200: policyResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.deactivatePolicy(
        request as Parameters<typeof controller.deactivatePolicy>[0],
        reply
      )
  );
}
