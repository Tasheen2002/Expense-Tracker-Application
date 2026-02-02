import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { BudgetPlanController } from "../controllers/budget-plan.controller";
import { ForecastController } from "../controllers/forecast.controller";
import { ScenarioController } from "../controllers/scenario.controller";
import { budgetPlanningRoutes } from "./budget-plan.routes";
import { forecastRoutes } from "./forecast.routes";
import { scenarioRoutes } from "./scenario.routes";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";

export async function registerBudgetPlanningRoutes(
  fastify: FastifyInstance,
  options: {
    budgetPlanController: BudgetPlanController;
    forecastController: ForecastController;
    scenarioController: ScenarioController;
  },
  prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      // Add authentication hook first
      instance.addHook("onRequest", async (request, reply) => {
        await fastify.authenticate(request);
      });

      // Add workspace authorization middleware
      instance.addHook("preHandler", async (request, reply) => {
        await workspaceAuthorizationMiddleware(request as any, reply, prisma);
      });

      await budgetPlanningRoutes(instance, options.budgetPlanController);
      await forecastRoutes(instance, options.forecastController);
      await scenarioRoutes(instance, options.scenarioController);
    },
    { prefix: "/api/v1" },
  );
}
