import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

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
      const userId = request.user.userId;
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
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const result = await this.acceptSuggestionHandler.handle({
        suggestionId,
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
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const result = await this.rejectSuggestionHandler.handle({
        suggestionId,
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
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const result = await this.deleteSuggestionHandler.handle({
        suggestionId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category suggestion deleted successfully'
      );
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
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const result = await this.getSuggestionByIdHandler.handle({
        suggestionId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Category suggestion retrieved successfully',
        result.data?.toJSON()
      );
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
      const userId = request.user.userId;
      const { workspaceId, expenseId } = request.params;

      const result = await this.getSuggestionsByExpenseHandler.handle({
        workspaceId,
        expenseId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Category suggestions retrieved successfully',
        result.data?.map((suggestion) => suggestion.toJSON())
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listSuggestions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { pendingOnly?: string; limit?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const { pendingOnly, limit: limitStr } = request.query;
      const limit = limitStr ? parseInt(limitStr) : undefined;

      if (pendingOnly === 'true') {
        const result =
          await this.getPendingSuggestionsByWorkspaceHandler.handle({
            workspaceId,
            limit,
          });
        return ResponseHelper.fromQuery(
          reply,
          result,
          'Pending category suggestions retrieved successfully',
          {
            items:
              result.data?.items.map((suggestion) => suggestion.toJSON()) || [],
            pagination: {
              total: result.data?.total || 0,
              limit: result.data?.limit || 10,
              offset: result.data?.offset || 0,
              hasMore: result.data?.hasMore || false,
            },
          }
        );
      } else {
        const result = await this.getSuggestionsByWorkspaceHandler.handle({
          workspaceId,
          limit,
        });
        return ResponseHelper.fromQuery(
          reply,
          result,
          'Category suggestions retrieved successfully',
          {
            items:
              result.data?.items.map((suggestion) => suggestion.toJSON()) || [],
            pagination: {
              total: result.data?.total || 0,
              limit: result.data?.limit || 10,
              offset: result.data?.offset || 0,
              hasMore: result.data?.hasMore || false,
            },
          }
        );
      }
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
