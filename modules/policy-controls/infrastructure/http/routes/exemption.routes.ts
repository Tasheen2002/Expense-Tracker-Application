import { FastifyInstance } from 'fastify';
import { ExemptionController } from '../controllers/exemption.controller';
import { ExemptionStatus } from '../../../domain/enums/exemption-status.enum';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  requestExemptionSchema,
  approveExemptionSchema,
  rejectExemptionSchema,
  exemptionParamsSchema,
  exemptionQuerySchema,
} from '../validation/exemption.schema';
import { workspaceParamsSchema } from '../validation/policy.schema';

export async function exemptionRoutes(
  fastify: FastifyInstance,
  controller: ExemptionController
) {
  // Add authentication hook to all routes in this plugin
  fastify.addHook('onRequest', fastify.authenticate);

  const exemptionSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      workspaceId: { type: 'string' },
      policyId: { type: 'string' },
      userId: { type: 'string' },
      status: { type: 'string', enum: Object.values(ExemptionStatus) },
      reason: { type: 'string' },
      requestedBy: { type: 'string' },
      approvedBy: { type: 'string', nullable: true },
      approvedAt: { type: 'string', format: 'date-time', nullable: true },
      rejectedBy: { type: 'string', nullable: true },
      rejectedAt: { type: 'string', format: 'date-time', nullable: true },
      rejectionReason: { type: 'string', nullable: true },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  };

  const exemptionResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: exemptionSchema,
    },
  };

  // Request exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateBody(requestExemptionSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Request a policy exemption',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['policyId', 'userId', 'reason', 'startDate', 'endDate'],
          properties: {
            policyId: { type: 'string' },
            userId: { type: 'string' },
            reason: { type: 'string', minLength: 10, maxLength: 1000 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          201: exemptionResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.requestExemption(
        request as Parameters<typeof controller.requestExemption>[0],
        reply
      )
  );

  // List exemptions
  fastify.get(
    '/workspaces/:workspaceId/exemptions',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(exemptionQuerySchema),
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'List policy exemptions for a workspace',
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
            status: {
              type: 'string',
              enum: Object.values(ExemptionStatus),
            },
            userId: { type: 'string' },
            policyId: { type: 'string' },
            limit: { type: 'string' },
            offset: { type: 'string' },
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
                    items: exemptionSchema,
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
      controller.listExemptions(
        request as Parameters<typeof controller.listExemptions>[0],
        reply
      )
  );

  // Check active exemption
  fastify.get(
    '/workspaces/:workspaceId/exemptions/active',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(exemptionQuerySchema),
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Check if user has active exemption for a policy',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['userId', 'policyId'],
          properties: {
            userId: { type: 'string' },
            policyId: { type: 'string' },
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
                nullable: true,
                properties: exemptionSchema.properties,
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.checkActiveExemption(
        request as Parameters<typeof controller.checkActiveExemption>[0],
        reply
      )
  );

  // Get exemption
  fastify.get(
    '/workspaces/:workspaceId/exemptions/:exemptionId',
    {
      preValidation: [validateParams(exemptionParamsSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Get policy exemption by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'exemptionId'],
          properties: {
            workspaceId: { type: 'string' },
            exemptionId: { type: 'string' },
          },
        },
        response: {
          200: exemptionResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.getExemption(
        request as Parameters<typeof controller.getExemption>[0],
        reply
      )
  );

  // Approve exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions/:exemptionId/approve',
    {
      preValidation: [validateParams(exemptionParamsSchema)],
      preHandler: [validateBody(approveExemptionSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Approve a policy exemption request',
        params: {
          type: 'object',
          required: ['workspaceId', 'exemptionId'],
          properties: {
            workspaceId: { type: 'string' },
            exemptionId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            approvalNote: { type: 'string', maxLength: 500 },
          },
        },
        response: {
          200: exemptionResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.approveExemption(
        request as Parameters<typeof controller.approveExemption>[0],
        reply
      )
  );

  // Reject exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions/:exemptionId/reject',
    {
      preValidation: [validateParams(exemptionParamsSchema)],
      preHandler: [validateBody(rejectExemptionSchema)],
      schema: {
        tags: ['Policy Controls'],
        description: 'Reject a policy exemption request',
        params: {
          type: 'object',
          required: ['workspaceId', 'exemptionId'],
          properties: {
            workspaceId: { type: 'string' },
            exemptionId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['rejectionReason'],
          properties: {
            rejectionReason: { type: 'string', minLength: 10, maxLength: 1000 },
          },
        },
        response: {
          200: exemptionResponseSchema,
        },
      },
    },
    (request, reply) =>
      controller.rejectExemption(
        request as Parameters<typeof controller.rejectExemption>[0],
        reply
      )
  );
}
