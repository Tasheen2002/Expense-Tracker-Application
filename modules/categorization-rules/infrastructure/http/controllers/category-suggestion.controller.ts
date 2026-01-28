import { FastifyRequest, FastifyReply } from 'fastify'
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper'
import { CreateSuggestionBody } from '../validation/category-suggestion.schema'

// Command Handlers
import {
  CreateSuggestionCommand,
  CreateSuggestionHandler,
} from '../../../application/commands/create-suggestion.command'
import {
  AcceptSuggestionCommand,
  AcceptSuggestionHandler,
} from '../../../application/commands/accept-suggestion.command'
import {
  RejectSuggestionCommand,
  RejectSuggestionHandler,
} from '../../../application/commands/reject-suggestion.command'
import {
  DeleteSuggestionCommand,
  DeleteSuggestionHandler,
} from '../../../application/commands/delete-suggestion.command'

// Query Handlers
import {
  GetSuggestionByIdQuery,
  GetSuggestionByIdHandler,
} from '../../../application/queries/get-suggestion-by-id.query'
import {
  GetSuggestionsByExpenseQuery,
  GetSuggestionsByExpenseHandler,
} from '../../../application/queries/get-suggestions-by-expense.query'
import {
  GetPendingSuggestionsByWorkspaceQuery,
  GetPendingSuggestionsByWorkspaceHandler,
} from '../../../application/queries/get-pending-suggestions-by-workspace.query'
import {
  GetSuggestionsByWorkspaceQuery,
  GetSuggestionsByWorkspaceHandler,
} from '../../../application/queries/get-suggestions-by-workspace.query'

export class CategorySuggestionController {
  constructor(
    private readonly createSuggestionHandler: CreateSuggestionHandler,
    private readonly acceptSuggestionHandler: AcceptSuggestionHandler,
    private readonly rejectSuggestionHandler: RejectSuggestionHandler,
    private readonly deleteSuggestionHandler: DeleteSuggestionHandler,
    private readonly getSuggestionByIdHandler: GetSuggestionByIdHandler,
    private readonly getSuggestionsByExpenseHandler: GetSuggestionsByExpenseHandler,
    private readonly getPendingSuggestionsByWorkspaceHandler: GetPendingSuggestionsByWorkspaceHandler,
    private readonly getSuggestionsByWorkspaceHandler: GetSuggestionsByWorkspaceHandler
  ) {}

  async createSuggestion(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Body: CreateSuggestionBody
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params

      const command: CreateSuggestionCommand = {
        workspaceId,
        expenseId: request.body.expenseId,
        suggestedCategoryId: request.body.suggestedCategoryId,
        confidence: request.body.confidence,
        reason: request.body.reason,
      }

      const suggestion = await this.createSuggestionHandler.execute(command)

      return ResponseHelper.success(
        reply,
        201,
        'Category suggestion created successfully',
        suggestion
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async acceptSuggestion(
    request: FastifyRequest<{
      Params: { workspaceId: string; suggestionId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { suggestionId } = request.params

      const command: AcceptSuggestionCommand = { suggestionId }
      const suggestion = await this.acceptSuggestionHandler.execute(command)

      return ResponseHelper.success(
        reply,
        200,
        'Category suggestion accepted successfully',
        suggestion
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async rejectSuggestion(
    request: FastifyRequest<{
      Params: { workspaceId: string; suggestionId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { suggestionId } = request.params

      const command: RejectSuggestionCommand = { suggestionId }
      const suggestion = await this.rejectSuggestionHandler.execute(command)

      return ResponseHelper.success(
        reply,
        200,
        'Category suggestion rejected successfully',
        suggestion
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async deleteSuggestion(
    request: FastifyRequest<{
      Params: { workspaceId: string; suggestionId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { suggestionId } = request.params

      const command: DeleteSuggestionCommand = { suggestionId }
      await this.deleteSuggestionHandler.execute(command)

      return ResponseHelper.success(reply, 200, 'Category suggestion deleted successfully')
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async getSuggestionById(
    request: FastifyRequest<{
      Params: { workspaceId: string; suggestionId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { suggestionId } = request.params

      const query: GetSuggestionByIdQuery = { suggestionId }
      const suggestion = await this.getSuggestionByIdHandler.execute(query)

      return ResponseHelper.success(
        reply,
        200,
        'Category suggestion retrieved successfully',
        suggestion
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async getSuggestionsByExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params

      const query: GetSuggestionsByExpenseQuery = { workspaceId, expenseId }
      const suggestions = await this.getSuggestionsByExpenseHandler.execute(query)

      return ResponseHelper.success(
        reply,
        200,
        'Category suggestions retrieved successfully',
        suggestions
      )
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }

  async listSuggestions(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Querystring: { pendingOnly?: string; limit?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params
      const { pendingOnly, limit: limitStr } = request.query
      const limit = limitStr ? parseInt(limitStr) : undefined

      if (pendingOnly === 'true') {
        const query: GetPendingSuggestionsByWorkspaceQuery = { workspaceId, limit }
        const suggestions = await this.getPendingSuggestionsByWorkspaceHandler.execute(query)
        return ResponseHelper.success(
          reply,
          200,
          'Pending category suggestions retrieved successfully',
          suggestions
        )
      } else {
        const query: GetSuggestionsByWorkspaceQuery = { workspaceId, limit }
        const suggestions = await this.getSuggestionsByWorkspaceHandler.execute(query)
        return ResponseHelper.success(
          reply,
          200,
          'Category suggestions retrieved successfully',
          suggestions
        )
      }
    } catch (error) {
      return ResponseHelper.error(reply, error)
    }
  }
}
