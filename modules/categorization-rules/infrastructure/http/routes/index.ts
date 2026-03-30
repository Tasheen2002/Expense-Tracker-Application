import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CategoryRuleController } from '../controllers/category-rule.controller';
import { RuleExecutionController } from '../controllers/rule-execution.controller';
import { CategorySuggestionController } from '../controllers/category-suggestion.controller';
import { categoryRuleRoutes } from './category-rule.routes';
import { ruleExecutionRoutes } from './rule-execution.routes';
import { categorySuggestionRoutes } from './category-suggestion.routes';
import { workspaceAuthorizationMiddleware } from '../../../../../apps/api/src/shared/middleware';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

export async function registerCategorizationRulesRoutes(
  fastify: FastifyInstance,
  controllers: {
    categoryRuleController: CategoryRuleController;
    ruleExecutionController: RuleExecutionController;
    categorySuggestionController: CategorySuggestionController;
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // First authenticate the request
      instance.addHook('onRequest', async (request, reply) => {
        await fastify.authenticate(request);
      });

      // Add workspace authorization middleware to all routes
      instance.addHook('preHandler', async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma
        );
      });

      await categoryRuleRoutes(instance, controllers.categoryRuleController);
      await ruleExecutionRoutes(instance, controllers.ruleExecutionController);
      await categorySuggestionRoutes(
        instance,
        controllers.categorySuggestionController
      );
    },
    { prefix: '/api/v1' }
  );
}
