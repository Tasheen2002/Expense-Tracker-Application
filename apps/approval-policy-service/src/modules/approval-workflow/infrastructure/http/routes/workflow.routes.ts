import { FastifyInstance } from 'fastify';
import { WorkflowController } from '../controllers/workflow.controller';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  initiateWorkflowSchema,
  approveStepSchema,
  rejectStepSchema,
  delegateStepSchema,
  cancelWorkflowSchema,
  paginationSchema,
  InitiateWorkflowBody,
  ApproveStepBody,
  RejectStepBody,
  DelegateStepBody,
  CancelWorkflowBody,
  WorkspaceParams,
  WorkflowParams,
  PaginationQuery,
  workspaceParamsJsonSchema,
  workflowParamsJsonSchema,
  initiateWorkflowBodyJsonSchema,
  approveStepBodyJsonSchema,
  rejectStepBodyJsonSchema,
  delegateStepBodyJsonSchema,
  cancelWorkflowBodyJsonSchema,
  paginationQueryJsonSchema,
  workflowEnvelopeJsonSchema,
  expenseEnvelopeJsonSchema,
  baseResponseEnvelopeJsonSchema,
  paginatedWorkflowsEnvelopeJsonSchema,
} from '../validation/approval.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userOrIpKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userOrIpKeyGenerator,
});

export async function workflowRoutes(
  fastify: FastifyInstance,
  controller: WorkflowController
) {
  // Initiate workflow
  fastify.post<{ Params: WorkspaceParams; Body: InitiateWorkflowBody }>(
    '/workspaces/:workspaceId/workflows',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        writeRateLimiter,
        validateBody(initiateWorkflowSchema),
      ],
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
    (request, reply) => controller.initiateWorkflow(request, reply)
  );

  // List pending approvals (Registered before dynamic :expenseId to avoid matching conflict)
  fastify.get<{ Params: WorkspaceParams; Querystring: PaginationQuery }>(
    '/workspaces/:workspaceId/workflows/pending-approvals',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(paginationSchema)],
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
    (request, reply) => controller.listPendingApprovals(request, reply)
  );

  // List user workflows (Registered before dynamic :expenseId to avoid matching conflict)
  fastify.get<{ Params: WorkspaceParams; Querystring: PaginationQuery }>(
    '/workspaces/:workspaceId/workflows/user-workflows',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(paginationSchema)],
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
    (request, reply) => controller.listUserWorkflows(request, reply)
  );

  // Get workflow by expense ID
  fastify.get<{ Params: WorkflowParams }>(
    '/workspaces/:workspaceId/workflows/:expenseId',
    {
      onRequest: [fastify.authenticate],
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
    (request, reply) => controller.getWorkflow(request, reply)
  );

  // Approve step
  fastify.post<{ Params: WorkflowParams; Body: ApproveStepBody }>(
    '/workspaces/:workspaceId/workflows/:expenseId/approve',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        writeRateLimiter,
        validateBody(approveStepSchema),
      ],
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
    (request, reply) => controller.approveStep(request, reply)
  );

  // Reject step
  fastify.post<{ Params: WorkflowParams; Body: RejectStepBody }>(
    '/workspaces/:workspaceId/workflows/:expenseId/reject',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        writeRateLimiter,
        validateBody(rejectStepSchema),
      ],
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
    (request, reply) => controller.rejectStep(request, reply)
  );

  // Delegate step
  fastify.post<{ Params: WorkflowParams; Body: DelegateStepBody }>(
    '/workspaces/:workspaceId/workflows/:expenseId/delegate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        writeRateLimiter,
        validateBody(delegateStepSchema),
      ],
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
    (request, reply) => controller.delegateStep(request, reply)
  );

  // Cancel workflow
  fastify.post<{ Params: WorkflowParams; Body?: CancelWorkflowBody }>(
    '/workspaces/:workspaceId/workflows/:expenseId/cancel',
    {
      onRequest: [fastify.authenticate],
      preValidation: async (request) => {
        if (request.body === undefined) {
          request.body = {};
        }
      },
      preHandler: [
        writeRateLimiter,
        validateBody(cancelWorkflowSchema),
      ],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Cancel workflow',
        security: [{ bearerAuth: [] }],
        params: workflowParamsJsonSchema,
        body: cancelWorkflowBodyJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.cancelWorkflow(request, reply)
  );
}
