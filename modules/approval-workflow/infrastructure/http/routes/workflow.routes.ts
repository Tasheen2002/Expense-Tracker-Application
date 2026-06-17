import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { WorkflowController } from '../controllers/workflow.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
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
  workflowParamsSchema,
  workspaceParamsSchema,
  workspaceParamsJsonSchema,
  workflowParamsJsonSchema,
  initiateWorkflowBodyJsonSchema,
  approveStepBodyJsonSchema,
  rejectStepBodyJsonSchema,
  delegateStepBodyJsonSchema,
  paginationQueryJsonSchema,
  workflowEnvelopeJsonSchema,
  expenseEnvelopeJsonSchema,
  baseResponseEnvelopeJsonSchema,
  paginatedWorkflowsEnvelopeJsonSchema,
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
  controller: WorkflowController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Initiate workflow
  fastify.post(
    '/workspaces/:workspaceId/workflows',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [fastify.authenticate, workspaceAuth, validateBody(initiateWorkflowSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Initiate approval workflow for an expense',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: initiateWorkflowBodyJsonSchema,
        response: {
          201: workflowEnvelopeJsonSchema,
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
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Get workflow by expense ID',
        security: [{ bearerAuth: [] }],
        params: workflowParamsJsonSchema,
        response: {
          200: workflowEnvelopeJsonSchema,
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
      preHandler: [fastify.authenticate, workspaceAuth, validateBody(approveStepSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Approve current workflow step',
        security: [{ bearerAuth: [] }],
        params: workflowParamsJsonSchema,
        body: approveStepBodyJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
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
      preHandler: [fastify.authenticate, workspaceAuth, validateBody(rejectStepSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Reject current workflow step',
        security: [{ bearerAuth: [] }],
        params: workflowParamsJsonSchema,
        body: rejectStepBodyJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
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
      preHandler: [fastify.authenticate, workspaceAuth, validateBody(delegateStepSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Delegate current workflow step to another user',
        security: [{ bearerAuth: [] }],
        params: workflowParamsJsonSchema,
        body: delegateStepBodyJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
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
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Cancel workflow',
        security: [{ bearerAuth: [] }],
        params: workflowParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
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
      preHandler: [fastify.authenticate, workspaceAuth, validateQuery(paginationSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'List pending approvals for current user',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedWorkflowsEnvelopeJsonSchema,
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
      preHandler: [fastify.authenticate, workspaceAuth, validateQuery(paginationSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'List all workflows for current user',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedWorkflowsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listUserWorkflows(request as AuthenticatedRequest, reply)
  );
}
