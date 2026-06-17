import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CategoryRuleController } from '../controllers/category-rule.controller';
import { RuleExecutionController } from '../controllers/rule-execution.controller';
import { CategorySuggestionController } from '../controllers/category-suggestion.controller';
import { categoryRuleRoutes } from './category-rule.routes';
import { ruleExecutionRoutes } from './rule-execution.routes';
import { categorySuggestionRoutes } from './category-suggestion.routes';

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
      await categoryRuleRoutes(instance, controllers.categoryRuleController, prisma);
      await ruleExecutionRoutes(instance, controllers.ruleExecutionController, prisma);
      await categorySuggestionRoutes(
        instance,
        controllers.categorySuggestionController,
        prisma
      );
    },
    { prefix: '/api/v1' }
  );
}
