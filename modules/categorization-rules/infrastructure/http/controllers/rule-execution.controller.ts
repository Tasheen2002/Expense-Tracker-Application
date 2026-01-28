import { FastifyRequest, FastifyReply } from 'fastify'
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper'
import { EvaluateRulesBody } from '../validation/rule-execution.schema'

// Command Handlers
import {
  EvaluateRulesCommand,
  EvaluateRulesHandler,
} from '../../../application/commands/evaluate-rules.command'

// Query Handlers
import {
  GetExecutionsByExpenseQuery,
  GetExecutionsByExpenseHandler,
} from '../../../application/queries/get-executions-by-expense.query'
import {
  GetExecutionsByWorkspaceQuery,
  GetExecutionsByWorkspaceHandler,
} from '../../../application/queries/get-executions-by-workspace.query'

export class RuleExecutionController {
  constructor(
    private readonly evaluateRulesHandler: EvaluateRulesHandler,
    private readonly getExecutionsByExpenseHandler: GetExecutionsByExpenseHandler,
    private readonly getExecutionsByWorkspaceHandler: GetExecutionsByWorkspaceHandler
  ) {}

  async evaluateRules(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Body: EvaluateRulesBody
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params

      const command: EvaluateRulesCommand = {
        workspaceId,
        expenseId: request.body.expenseId,
        expenseData: request.body.expenseData,
      }

      const result = await this.evaluateRulesHandler.execute(command)

      return ResponseHelper.success(
        reply,
        200,
        'Rules evaluated successfully',
        result
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async getExecutionsByExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params

      const query: GetExecutionsByExpenseQuery = { workspaceId, expenseId }
      const executions = await this.getExecutionsByExpenseHandler.execute(query)

      return ResponseHelper.success(
        reply,
        200,
        'Executions retrieved successfully',
        executions
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async getExecutionsByWorkspace(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Querystring: { limit?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params
      const limit = request.query.limit ? parseInt(request.query.limit) : undefined

      const query: GetExecutionsByWorkspaceQuery = { workspaceId, limit }
      const executions = await this.getExecutionsByWorkspaceHandler.execute(query)

      return ResponseHelper.success(
        reply,
        200,
        'Executions retrieved successfully',
        executions
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }
}
