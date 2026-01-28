import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { categorizationRulesRoutes } from './index'
import { CategoryRuleController } from '../controllers/category-rule.controller'
import { RuleExecutionController } from '../controllers/rule-execution.controller'
import { CategorySuggestionController } from '../controllers/category-suggestion.controller'
import { workspaceAuthorizationMiddleware } from '../../../../../apps/api/src/shared/middleware'

export async function registerCategorizationRulesRoutes(
  fastify: FastifyInstance,
  controllers: {
    categoryRuleController: CategoryRuleController
    ruleExecutionController: RuleExecutionController
    categorySuggestionController: CategorySuggestionController
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // Add workspace authorization middleware to all routes
      instance.addHook('onRequest', async (request, reply) => {
        await workspaceAuthorizationMiddleware(request as any, reply, prisma)
      })

      await categorizationRulesRoutes(instance, controllers)
    },
    { prefix: '/api/v1' }
  )
}
