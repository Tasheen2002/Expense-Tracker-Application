import { FastifyInstance } from "fastify";
import { WorkflowController } from "../controllers/workflow.controller";

export async function workflowRoutes(
  fastify: FastifyInstance,
  controller: WorkflowController,
) {
  // Initiate workflow
  fastify.post(
    "/:workspaceId/workflows",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "Initiate approval workflow for an expense",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["expenseId", "amount", "hasReceipt"],
          properties: {
            expenseId: { type: "string", format: "uuid" },
            amount: { type: "number", minimum: 0.01 },
            categoryId: { type: "string", format: "uuid" },
            hasReceipt: { type: "boolean" },
          },
        },
      },
    },
    (request, reply) => controller.initiateWorkflow(request as any, reply),
  );

  // Get workflow
  fastify.get(
    "/:workspaceId/workflows/:expenseId",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "Get workflow by expense ID",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getWorkflow(request as any, reply),
  );

  // Approve step
  fastify.post(
    "/:workspaceId/workflows/:expenseId/approve",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "Approve current workflow step",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            comments: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.approveStep(request as any, reply),
  );

  // Reject step
  fastify.post(
    "/:workspaceId/workflows/:expenseId/reject",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "Reject current workflow step",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["comments"],
          properties: {
            comments: { type: "string", minLength: 1 },
          },
        },
      },
    },
    (request, reply) => controller.rejectStep(request as any, reply),
  );

  // Delegate step
  fastify.post(
    "/:workspaceId/workflows/:expenseId/delegate",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "Delegate current workflow step to another user",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["toUserId"],
          properties: {
            toUserId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.delegateStep(request as any, reply),
  );

  // Cancel workflow
  fastify.post(
    "/:workspaceId/workflows/:expenseId/cancel",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "Cancel workflow",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.cancelWorkflow(request as any, reply),
  );

  // List pending approvals
  fastify.get(
    "/:workspaceId/workflows/pending-approvals",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "List pending approvals for current user",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.listPendingApprovals(request as any, reply),
  );

  // List user workflows
  fastify.get(
    "/:workspaceId/workflows/user-workflows",
    {
      schema: {
        tags: ["Approval Workflow"],
        description: "List all workflows for current user",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.listUserWorkflows(request as any, reply),
  );
}
