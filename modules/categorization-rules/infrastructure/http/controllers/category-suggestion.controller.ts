import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';

interface CreateSuggestionBody {
  expenseId: string;
  suggestedCategoryId: string;
  confidence: number;
  reason?: string;
}

// Command Handlers
import { CreateSuggestionHandler } from '../../../application/commands/create-suggestion.command';
import { AcceptSuggestionHandler } from '../../../application/commands/accept-suggestion.command';
import { RejectSuggestionHandler } from '../../../application/commands/reject-suggestion.command';
import { DeleteSuggestionHandler } from '../../../application/commands/delete-suggestion.command';

// Query Handlers
import { GetSuggestionByIdHandler } from '../../../application/queries/get-suggestion-by-id.query';
import { GetSuggestionsByExpenseHandler } from '../../../application/queries/get-suggestions-by-expense.query';
import { GetPendingSuggestionsByWorkspaceHandler } from '../../../application/queries/get-pending-suggestions-by-workspace.query';
import { GetSuggestionsByWorkspaceHandler } from '../../../application/queries/get-suggestions-by-workspace.query';

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
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateSuggestionBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.createSuggestionHandler.handle({
        workspaceId,
        expenseId: request.body.expenseId,
        suggestedCategoryId: request.body.suggestedCategoryId,
        confidence: request.body.confidence,
        reason: request.body.reason,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category suggestion created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acceptSuggestion(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, suggestionId } = request.params;

      const result = await this.acceptSuggestionHandler.handle({
        suggestionId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category suggestion accepted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectSuggestion(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, suggestionId } = request.params;

      const result = await this.rejectSuggestionHandler.handle({
        suggestionId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category suggestion rejected successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteSuggestion(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, suggestionId } = request.params;

      const result = await this.deleteSuggestionHandler.handle({
        suggestionId,
        workspaceId,
      });

      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Category suggestion deletion failed');
      }

      return reply.status(204).send();
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSuggestionById(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, suggestionId } = request.params;

      const suggestion = await this.getSuggestionByIdHandler.handle({
        suggestionId,
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Category suggestion retrieved successfully', suggestion);
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSuggestionsByExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const suggestions = await this.getSuggestionsByExpenseHandler.handle({
        workspaceId,
        expenseId,
      });

      return ResponseHelper.ok(reply, 'Category suggestions retrieved successfully', suggestions);
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listSuggestions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { pendingOnly?: string | boolean; limit?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { pendingOnly, limit: limitStr } = request.query;
      const limit = limitStr ? parseInt(limitStr) : undefined;

      if (pendingOnly === true || pendingOnly === 'true') {
        const result = await this.getPendingSuggestionsByWorkspaceHandler.handle({
          workspaceId,
          limit,
        });
        return ResponseHelper.ok(
          reply,
          'Pending category suggestions retrieved successfully',
          {
            items: result.items,
            pagination: {
              total: result.total,
              limit: result.limit,
              offset: result.offset,
              hasMore: result.hasMore,
            },
          }
        );
      } else {
        const result = await this.getSuggestionsByWorkspaceHandler.handle({
          workspaceId,
          limit,
        });
        return ResponseHelper.ok(
          reply,
          'Category suggestions retrieved successfully',
          {
            items: result.items,
            pagination: {
              total: result.total,
              limit: result.limit,
              offset: result.offset,
              hasMore: result.hasMore,
            },
          }
        );
      }
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
