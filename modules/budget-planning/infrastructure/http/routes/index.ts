import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { BudgetPlanController } from '../controllers/budget-plan.controller';
import { ForecastController } from '../controllers/forecast.controller';
import { ScenarioController } from '../controllers/scenario.controller';
import { budgetPlanningRoutes } from './budget-plan.routes';
import { forecastRoutes } from './forecast.routes';
import { scenarioRoutes } from './scenario.routes';

export async function registerBudgetPlanningRoutes(
  fastify: FastifyInstance,
  controllers: {
    budgetPlanController: BudgetPlanController;
    forecastController: ForecastController;
    scenarioController: ScenarioController;
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      await budgetPlanningRoutes(instance, controllers.budgetPlanController);
      await forecastRoutes(instance, controllers.forecastController);
      await scenarioRoutes(instance, controllers.scenarioController);
    },
    { prefix: '/api/v1' }
  );
}
