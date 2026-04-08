import { FastifyInstance } from 'fastify';
import { WorkflowController } from '../controllers/workflow.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../validation/validator';
import {
  initiateWorkflowSchema,
  approveStepSchema,
  rejectStepSchema,
  delegateStepSchema,
  paginationSchema,
  workspaceParamsSchema,
  workflowParamsSchema,
  workflowSchema,
  paginatedWorkflowsResponseSchema,
} from '../validation/approval.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function workflowRoutes(
  fastify: FastifyInstance,
  controller: WorkflowController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });
  // Initiate workflow
  fastify.post(
    '/workspaces/:workspaceId/workflows',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateBody(initiateWorkflowSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Initiate approval workflow for an expense',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['expenseId', 'amount', 'hasReceipt'],
          properties: {
            expenseId: { type: 'string', format: 'uuid' },
            amount: { type: 'number', minimum: 0.01 },
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            hasReceipt: { type: 'boolean' },
          },
        },
        response: {
          201: {
            description: 'Workflow initiated successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: workflowSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.initiateWorkflow(request as AuthenticatedRequest, reply)
  );

  // Get workflow
  fastify.get(
    '/workspaces/:workspaceId/workflows/:expenseId',
    {
      preValidation: [validateParams(workflowParamsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Get workflow by expense ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Workflow retrieved successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: workflowSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getWorkflow(request as AuthenticatedRequest, reply)
  );

  // Approve step
  fastify.post(
    '/workspaces/:workspaceId/workflows/:expenseId/approve',
    {
      preValidation: [validateParams(workflowParamsSchema)],
      preHandler: [validateBody(approveStepSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Approve current workflow step',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            comments: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Workflow step approved successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: workflowSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.approveStep(request as AuthenticatedRequest, reply)
  );

  // Reject step
  fastify.post(
    '/workspaces/:workspaceId/workflows/:expenseId/reject',
    {
      preValidation: [validateParams(workflowParamsSchema)],
      preHandler: [validateBody(rejectStepSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Reject current workflow step',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['comments'],
          properties: {
            comments: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            description: 'Workflow step rejected successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: workflowSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.rejectStep(request as AuthenticatedRequest, reply)
  );

  // Delegate step
  fastify.post(
    '/workspaces/:workspaceId/workflows/:expenseId/delegate',
    {
      preValidation: [validateParams(workflowParamsSchema)],
      preHandler: [validateBody(delegateStepSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Delegate current workflow step to another user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['toUserId'],
          properties: {
            toUserId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Workflow step delegated successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: workflowSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.delegateStep(request as AuthenticatedRequest, reply)
  );

  // Cancel workflow
  fastify.post(
    '/workspaces/:workspaceId/workflows/:expenseId/cancel',
    {
      preValidation: [validateParams(workflowParamsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Cancel workflow',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Workflow cancelled successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: workflowSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.cancelWorkflow(request as AuthenticatedRequest, reply)
  );

  // List pending approvals
  fastify.get(
    '/workspaces/:workspaceId/workflows/pending-approvals',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateQuery(paginationSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'List pending approvals for current user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'Pending approvals retrieved successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: paginatedWorkflowsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listPendingApprovals(request as AuthenticatedRequest, reply)
  );

  // List user workflows
  fastify.get(
    '/workspaces/:workspaceId/workflows/user-workflows',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateQuery(paginationSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'List all workflows for current user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'User workflows retrieved successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: paginatedWorkflowsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listUserWorkflows(request as AuthenticatedRequest, reply)
  );
}
