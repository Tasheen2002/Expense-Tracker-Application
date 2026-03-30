import { FastifyInstance } from 'fastify';
import { WorkflowController } from '../controllers/workflow.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

const approvalStepSchema = {
  type: 'object',
  properties: {
    stepId: { type: 'string', format: 'uuid' },
    workflowId: { type: 'string', format: 'uuid' },
    stepNumber: { type: 'number' },
    approverId: { type: 'string', format: 'uuid' },
    delegatedTo: { type: 'string', format: 'uuid', nullable: true },
    status: { type: 'string' },
    comments: { type: 'string', nullable: true },
    processedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const workflowSchema = {
  type: 'object',
  properties: {
    workflowId: { type: 'string', format: 'uuid' },
    expenseId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    chainId: { type: 'string', format: 'uuid', nullable: true },
    status: { type: 'string' },
    currentStepNumber: { type: 'number' },
    steps: {
      type: 'array',
      items: approvalStepSchema,
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

export async function workflowRoutes(
  fastify: FastifyInstance,
  controller: WorkflowController
) {
  // Initiate workflow
  fastify.post(
    '/workspaces/:workspaceId/workflows',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Initiate approval workflow for an expense',
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
            categoryId: { type: 'string', format: 'uuid' },
            hasReceipt: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  workflowId: { type: 'string', format: 'uuid' },
                },
              },
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
      schema: {
        tags: ['Approval Workflow'],
        description: 'Get workflow by expense ID',
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
            type: 'object',
            properties: {
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
      schema: {
        tags: ['Approval Workflow'],
        description: 'Approve current workflow step',
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
            comments: { type: 'string' },
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
      controller.approveStep(request as AuthenticatedRequest, reply)
  );

  // Reject step
  fastify.post(
    '/workspaces/:workspaceId/workflows/:expenseId/reject',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Reject current workflow step',
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
      controller.rejectStep(request as AuthenticatedRequest, reply)
  );

  // Delegate step
  fastify.post(
    '/workspaces/:workspaceId/workflows/:expenseId/delegate',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Delegate current workflow step to another user',
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
      controller.delegateStep(request as AuthenticatedRequest, reply)
  );

  // Cancel workflow
  fastify.post(
    '/workspaces/:workspaceId/workflows/:expenseId/cancel',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Cancel workflow',
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
      controller.cancelWorkflow(request as AuthenticatedRequest, reply)
  );

  // List pending approvals
  fastify.get(
    '/workspaces/:workspaceId/workflows/pending-approvals',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'List pending approvals for current user',
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
                    items: workflowSchema,
                  },
                  pagination: {
                    type: 'object',
                    properties: {
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
      },
    },
    (request, reply) =>
      controller.listPendingApprovals(request as AuthenticatedRequest, reply)
  );

  // List user workflows
  fastify.get(
    '/workspaces/:workspaceId/workflows/user-workflows',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'List all workflows for current user',
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
                    items: workflowSchema,
                  },
                  pagination: {
                    type: 'object',
                    properties: {
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
      },
    },
    (request, reply) =>
      controller.listUserWorkflows(request as AuthenticatedRequest, reply)
  );
}
