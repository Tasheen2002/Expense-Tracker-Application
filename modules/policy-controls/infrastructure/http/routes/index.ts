import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { policyRoutes } from "./policy.routes";
import { violationRoutes } from "./violation.routes";
import { exemptionRoutes } from "./exemption.routes";
import { PolicyController } from "../controllers/policy.controller";
import { ViolationController } from "../controllers/violation.controller";
import { ExemptionController } from "../controllers/exemption.controller";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";

interface PolicyControlsServices {
  policyController: PolicyController;
  violationController: ViolationController;
  exemptionController: ExemptionController;
  prisma: PrismaClient;
}

export async function registerPolicyControlsRoutes(
  fastify: FastifyInstance,
  services: PolicyControlsServices,
) {
  await fastify.register(
    async (instance) => {
      // Add workspace authorization middleware to all routes
      instance.addHook("onRequest", async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as any,
          reply,
          services.prisma,
        );
      });

      // Register policy routes
      await policyRoutes(instance, services.policyController);

      // Register violation routes
      await violationRoutes(instance, services.violationController);

      // Register exemption routes
      await exemptionRoutes(instance, services.exemptionController);
    },
    { prefix: "/api/v1" },
  );
}
