import { FastifyInstance } from 'fastify'
import { BudgetController } from '../controllers/budget.controller'

export async function budgetRoutes(
  fastify: FastifyInstance,
  controller: BudgetController
) {
  // Create budget
  fastify.post(
    '/:workspaceId/budgets',
    {
      schema: {
        tags: ['Budget'],
        description: 'Create a new budget',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'totalAmount', 'currency', 'periodType', 'startDate'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            totalAmount: { type: 'number', minimum: 0.01 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            periodType: { type: 'string', enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            isRecurring: { type: 'boolean' },
            rolloverUnused: { type: 'boolean' },
          },
        },
      },
    },
    (request, reply) => controller.createBudget(request as any, reply)
  )

  // List budgets
  fastify.get(
    '/:workspaceId/budgets',
    {
      schema: {
        tags: ['Budget'],
        description: 'List all budgets in workspace',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED', 'EXCEEDED'] },
            isActive: { type: 'string', enum: ['true', 'false'] },
            createdBy: { type: 'string', format: 'uuid' },
            currency: { type: 'string' },
          },
        },
      },
    },
    (request, reply) => controller.listBudgets(request as any, reply)
  )

  // Get budget by ID
  fastify.get(
    '/:workspaceId/budgets/:budgetId',
    {
      schema: {
        tags: ['Budget'],
        description: 'Get budget by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.getBudget(request as any, reply)
  )

  // Update budget
  fastify.put(
    '/:workspaceId/budgets/:budgetId',
    {
      schema: {
        tags: ['Budget'],
        description: 'Update budget',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: ['string', 'null'] },
            totalAmount: { type: 'number', minimum: 0.01 },
          },
        },
      },
    },
    (request, reply) => controller.updateBudget(request as any, reply)
  )

  // Activate budget
  fastify.post(
    '/:workspaceId/budgets/:budgetId/activate',
    {
      schema: {
        tags: ['Budget'],
        description: 'Activate budget',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.activateBudget(request as any, reply)
  )

  // Archive budget
  fastify.post(
    '/:workspaceId/budgets/:budgetId/archive',
    {
      schema: {
        tags: ['Budget'],
        description: 'Archive budget',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.archiveBudget(request as any, reply)
  )

  // Delete budget
  fastify.delete(
    '/:workspaceId/budgets/:budgetId',
    {
      schema: {
        tags: ['Budget'],
        description: 'Delete budget',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.deleteBudget(request as any, reply)
  )

  // Add allocation
  fastify.post(
    '/:workspaceId/budgets/:budgetId/allocations',
    {
      schema: {
        tags: ['Budget Allocation'],
        description: 'Add allocation to budget',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['allocatedAmount'],
          properties: {
            categoryId: { type: 'string', format: 'uuid' },
            allocatedAmount: { type: 'number', minimum: 0.01 },
            description: { type: 'string' },
          },
        },
      },
    },
    (request, reply) => controller.addAllocation(request as any, reply)
  )

  // Get allocations
  fastify.get(
    '/:workspaceId/budgets/:budgetId/allocations',
    {
      schema: {
        tags: ['Budget Allocation'],
        description: 'Get budget allocations',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.getAllocations(request as any, reply)
  )

  // Update allocation
  fastify.put(
    '/:workspaceId/budgets/:budgetId/allocations/:allocationId',
    {
      schema: {
        tags: ['Budget Allocation'],
        description: 'Update allocation',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId', 'allocationId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
            allocationId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            allocatedAmount: { type: 'number', minimum: 0.01 },
            description: { type: ['string', 'null'] },
          },
        },
      },
    },
    (request, reply) => controller.updateAllocation(request as any, reply)
  )

  // Delete allocation
  fastify.delete(
    '/:workspaceId/budgets/:budgetId/allocations/:allocationId',
    {
      schema: {
        tags: ['Budget Allocation'],
        description: 'Delete allocation',
        params: {
          type: 'object',
          required: ['workspaceId', 'budgetId', 'allocationId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            budgetId: { type: 'string', format: 'uuid' },
            allocationId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.deleteAllocation(request as any, reply)
  )

  // Get unread alerts
  fastify.get(
    '/:workspaceId/budgets/alerts/unread',
    {
      schema: {
        tags: ['Budget Alert'],
        description: 'Get unread budget alerts',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.getUnreadAlerts(request as any, reply)
  )
}
