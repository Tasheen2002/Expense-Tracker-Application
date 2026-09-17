import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateSuggestionHandler,
  AcceptSuggestionHandler,
  RejectSuggestionHandler,
  DeleteSuggestionHandler,
  GetSuggestionByIdHandler,
  GetSuggestionsByExpenseHandler,
  GetPendingSuggestionsByWorkspaceHandler,
  GetSuggestionsByWorkspaceHandler,
} from '../../../application';
import {
  WorkspaceParams,
  SuggestionParams,
  ExpenseParams,
  CreateSuggestionBody,
  SuggestionQuery,
} from '../validation/categorization-rules.schema';

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

  // ==================== READS / QUERIES ====================

  async getSuggestionById(
    request: AuthenticatedRequest<{ Params: SuggestionParams }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, suggestionId } = request.params;

      const suggestion = await this.getSuggestionByIdHandler.handle({
        suggestionId,
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Category suggestion retrieved successfully', suggestion);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSuggestionsByExpense(
    request: AuthenticatedRequest<{ Params: ExpenseParams }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const suggestions = await this.getSuggestionsByExpenseHandler.handle({
        workspaceId,
        expenseId,
      });

      return ResponseHelper.ok(reply, 'Category suggestions retrieved successfully', suggestions);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listSuggestions(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: SuggestionQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { pendingOnly, limit, offset } = request.query;

      if (pendingOnly === true) {
        const result = await this.getPendingSuggestionsByWorkspaceHandler.handle({
          workspaceId,
          limit,
          offset,
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
          offset,
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ==================== WRITES / COMMANDS ====================

  async createSuggestion(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acceptSuggestion(
    request: AuthenticatedRequest<{ Params: SuggestionParams }>,
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectSuggestion(
    request: AuthenticatedRequest<{ Params: SuggestionParams }>,
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteSuggestion(
    request: AuthenticatedRequest<{ Params: SuggestionParams }>,
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
