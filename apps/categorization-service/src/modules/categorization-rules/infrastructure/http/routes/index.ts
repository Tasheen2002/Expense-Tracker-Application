import { FastifyInstance } from 'fastify';
import { CategoryRuleController } from '../controllers/category-rule.controller';
import { RuleExecutionController } from '../controllers/rule-execution.controller';
import { CategorySuggestionController } from '../controllers/category-suggestion.controller';
import { categoryRuleRoutes } from './category-rule.routes';
import { ruleExecutionRoutes } from './rule-execution.routes';
import { categorySuggestionRoutes } from './category-suggestion.routes';
import { createRateLimiter, RateLimitPresets, userKeyGenerator } from '@shared/middleware/rate-limiter.middleware';

export async function registerCategorizationRulesRoutes(
  fastify: FastifyInstance,
  controllers: {
    categoryRuleController: CategoryRuleController;
    ruleExecutionController: RuleExecutionController;
    categorySuggestionController: CategorySuggestionController;
  }
) {
  const limits = {
    write: createRateLimiter({ ...RateLimitPresets.writeOperations, keyGenerator: userKeyGenerator }),
    read: createRateLimiter({ ...RateLimitPresets.readOperations, keyGenerator: userKeyGenerator }),
  };
  await fastify.register(
    async (instance) => {
      await categoryRuleRoutes(instance, controllers.categoryRuleController, limits);
      await ruleExecutionRoutes(instance, controllers.ruleExecutionController, limits);
      await categorySuggestionRoutes(
        instance,
        controllers.categorySuggestionController,
        limits
      );
    },
    { prefix: '/api/v1' }
  );
}
