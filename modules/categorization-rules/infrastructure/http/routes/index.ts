import { FastifyInstance } from 'fastify'
import { CategoryRuleController } from '../controllers/category-rule.controller'
import { RuleExecutionController } from '../controllers/rule-execution.controller'
import { CategorySuggestionController } from '../controllers/category-suggestion.controller'
import { categoryRuleRoutes } from './category-rule.routes'
import { ruleExecutionRoutes } from './rule-execution.routes'
import { categorySuggestionRoutes } from './category-suggestion.routes'

export async function categorizationRulesRoutes(
  fastify: FastifyInstance,
  controllers: {
    categoryRuleController: CategoryRuleController
    ruleExecutionController: RuleExecutionController
    categorySuggestionController: CategorySuggestionController
  }
) {
  await categoryRuleRoutes(fastify, controllers.categoryRuleController)
  await ruleExecutionRoutes(fastify, controllers.ruleExecutionController)
  await categorySuggestionRoutes(fastify, controllers.categorySuggestionController)
}
