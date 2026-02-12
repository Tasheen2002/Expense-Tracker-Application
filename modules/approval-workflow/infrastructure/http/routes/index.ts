import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { approvalChainRoutes } from "./approval-chain.routes";
import { workflowRoutes } from "./workflow.routes";
import { ApprovalChainController } from "../controllers/approval-chain.controller";
import { WorkflowController } from "../controllers/workflow.controller";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

interface ApprovalWorkflowServices {
  approvalChainController: ApprovalChainController;
  workflowController: WorkflowController;
  prisma: PrismaClient;
}

export async function registerApprovalWorkflowRoutes(
  fastify: FastifyInstance,
  services: ApprovalWorkflowServices,
) {
  await fastify.register(
    async (instance) => {
      // Add workspace authorization middleware to all routes
      instance.addHook("onRequest", async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          services.prisma,
        );
      });

      // Register approval chain routes
      await approvalChainRoutes(instance, services.approvalChainController);

      // Register workflow routes
      await workflowRoutes(instance, services.workflowController);
    },
    { prefix: "/api/v1" },
  );
}
