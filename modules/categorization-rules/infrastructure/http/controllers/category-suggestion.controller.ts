import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { CategorySuggestion } from "../../../domain/entities/category-suggestion.entity";
import { CreateSuggestionBody } from "../validation/category-suggestion.schema";
import {
  CreateSuggestionCommand,
  CreateSuggestionHandler,
  AcceptSuggestionCommand,
  AcceptSuggestionHandler,
  RejectSuggestionCommand,
  RejectSuggestionHandler,
  DeleteSuggestionCommand,
  DeleteSuggestionHandler,
  GetSuggestionByIdQuery,
  GetSuggestionByIdHandler,
  GetSuggestionsByExpenseQuery,
  GetSuggestionsByExpenseHandler,
  GetPendingSuggestionsByWorkspaceQuery,
  GetPendingSuggestionsByWorkspaceHandler,
  GetSuggestionsByWorkspaceQuery,
  GetSuggestionsByWorkspaceHandler,
} from "../../../application";

export class CategorySuggestionController {
  constructor(
    private readonly createSuggestionHandler: CreateSuggestionHandler,
    private readonly acceptSuggestionHandler: AcceptSuggestionHandler,
    private readonly rejectSuggestionHandler: RejectSuggestionHandler,
    private readonly deleteSuggestionHandler: DeleteSuggestionHandler,
    private readonly getSuggestionByIdHandler: GetSuggestionByIdHandler,
    private readonly getSuggestionsByExpenseHandler: GetSuggestionsByExpenseHandler,
    private readonly getPendingSuggestionsByWorkspaceHandler: GetPendingSuggestionsByWorkspaceHandler,
    private readonly getSuggestionsByWorkspaceHandler: GetSuggestionsByWorkspaceHandler,
  ) {}

  // ============================================================================
  // Serialization Helpers
  // ============================================================================

  private serializeSuggestion(suggestion: CategorySuggestion) {
    return {
      suggestionId: suggestion.getId().getValue(),
      workspaceId: suggestion.getWorkspaceId().getValue(),
      expenseId: suggestion.getExpenseId().getValue(),
      suggestedCategoryId: suggestion.getSuggestedCategoryId().getValue(),
      confidence: suggestion.getConfidence().getValue(),
      reason: suggestion.getReason(),
      isAccepted: suggestion.getIsAccepted(),
      createdAt: suggestion.getCreatedAt().toISOString(),
      respondedAt: suggestion.getRespondedAt() ? suggestion.getRespondedAt()!.toISOString() : null,
    };
  }

  // ============================================================================
  // Queries
  // ============================================================================

  async getSuggestionById(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const query: GetSuggestionByIdQuery = { suggestionId };
      const suggestion = await this.getSuggestionByIdHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Category suggestion retrieved successfully",
        this.serializeSuggestion(suggestion),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSuggestionsByExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, expenseId } = request.params;

      const query: GetSuggestionsByExpenseQuery = { workspaceId, expenseId };
      const result = await this.getSuggestionsByExpenseHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Category suggestions retrieved successfully",
        {
          items: result.items.map(s => this.serializeSuggestion(s)),
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listSuggestions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { pendingOnly?: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const { pendingOnly, limit: limitStr, offset: offsetStr } = request.query;
      const limit = limitStr ? parseInt(limitStr) : undefined;
      const offset = offsetStr ? parseInt(offsetStr) : undefined;

      if (pendingOnly === "true") {
        const query: GetPendingSuggestionsByWorkspaceQuery = {
          workspaceId,
          limit,
          offset,
        };
        const result = await this.getPendingSuggestionsByWorkspaceHandler.handle(query);
        return ResponseHelper.success(
          reply,
          200,
          "Pending category suggestions retrieved successfully",
          {
            items: result.items.map(s => this.serializeSuggestion(s)),
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        );
      } else {
        const query: GetSuggestionsByWorkspaceQuery = { workspaceId, limit, offset };
        const result = await this.getSuggestionsByWorkspaceHandler.handle(query);
        return ResponseHelper.success(
          reply,
          200,
          "Category suggestions retrieved successfully",
          {
            items: result.items.map(s => this.serializeSuggestion(s)),
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        );
      }
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ============================================================================
  // Commands
  // ============================================================================

  async createSuggestion(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateSuggestionBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;

      const command: CreateSuggestionCommand = {
        workspaceId,
        expenseId: request.body.expenseId,
        suggestedCategoryId: request.body.suggestedCategoryId,
        confidence: request.body.confidence,
        reason: request.body.reason,
      };

      const result = await this.createSuggestionHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to create category suggestion",
          details: result.errors,
        });
      }

      const suggestion = result.data!;
      return ResponseHelper.success(
        reply,
        201,
        "Category suggestion created successfully",
        this.serializeSuggestion(suggestion),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acceptSuggestion(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const command: AcceptSuggestionCommand = { suggestionId };
      const result = await this.acceptSuggestionHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to accept category suggestion",
          details: result.errors,
        });
      }

      const suggestion = result.data!;
      return ResponseHelper.success(
        reply,
        200,
        "Category suggestion accepted successfully",
        this.serializeSuggestion(suggestion),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectSuggestion(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const command: RejectSuggestionCommand = { suggestionId };
      const result = await this.rejectSuggestionHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to reject category suggestion",
          details: result.errors,
        });
      }

      const suggestion = result.data!;
      return ResponseHelper.success(
        reply,
        200,
        "Category suggestion rejected successfully",
        this.serializeSuggestion(suggestion),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteSuggestion(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; suggestionId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { suggestionId } = request.params;

      const command: DeleteSuggestionCommand = { suggestionId };
      const result = await this.deleteSuggestionHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to delete category suggestion",
          details: result.errors,
        });
      }

      return ResponseHelper.success(
        reply,
        200,
        "Category suggestion deleted successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
