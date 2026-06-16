import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { RuleExecution } from "../../../domain/entities/rule-execution.entity";
import { CategoryRule } from "../../../domain/entities/category-rule.entity";
import { EvaluateRulesBody } from "../validation/rule-execution.schema";
import {
  EvaluateRulesCommand,
  EvaluateRulesHandler,
  GetExecutionsByExpenseQuery,
  GetExecutionsByExpenseHandler,
  GetExecutionsByWorkspaceQuery,
  GetExecutionsByWorkspaceHandler,
} from "../../../application";

export class RuleExecutionController {
  constructor(
    private readonly evaluateRulesHandler: EvaluateRulesHandler,
    private readonly getExecutionsByExpenseHandler: GetExecutionsByExpenseHandler,
    private readonly getExecutionsByWorkspaceHandler: GetExecutionsByWorkspaceHandler,
  ) {}

  // ============================================================================
  // Serialization Helpers
  // ============================================================================

  private serializeExecution(execution: RuleExecution) {
    return {
      executionId: execution.getId().getValue(),
      ruleId: execution.getRuleId().getValue(),
      expenseId: execution.getExpenseId().getValue(),
      workspaceId: execution.getWorkspaceId().getValue(),
      appliedCategoryId: execution.getAppliedCategoryId().getValue(),
      executedAt: execution.getExecutedAt().toISOString(),
    };
  }

  // ============================================================================
  // Queries
  // ============================================================================

  async getExecutionsByExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, expenseId } = request.params;

      const query: GetExecutionsByExpenseQuery = { workspaceId, expenseId };
      const result = await this.getExecutionsByExpenseHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Rule executions retrieved successfully",
        {
          items: result.items.map(e => this.serializeExecution(e)),
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

  async getExecutionsByWorkspace(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit) : undefined;
      const offset = request.query.offset ? parseInt(request.query.offset) : undefined;

      const query: GetExecutionsByWorkspaceQuery = {
        workspaceId,
        limit,
        offset,
      };
      const result = await this.getExecutionsByWorkspaceHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Executions retrieved successfully",
        {
          items: result.items.map(e => this.serializeExecution(e)),
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

  // ============================================================================
  // Commands
  // ============================================================================

  async evaluateRules(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: EvaluateRulesBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;

      const command: EvaluateRulesCommand = {
        workspaceId,
        expenseId: request.body.expenseId,
        expenseData: request.body.expenseData,
      };

      const result = await this.evaluateRulesHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to evaluate rules",
          details: result.errors,
        });
      }

      const data = result.data!;
      return ResponseHelper.success(
        reply,
        200,
        "Rules evaluated successfully",
        {
          appliedRule: data.appliedRule
            ? {
                id: data.appliedRule.getId().getValue(),
                name: data.appliedRule.getName(),
                priority: data.appliedRule.getPriority(),
              }
            : null,
          suggestedCategoryId: data.suggestedCategoryId?.getValue() || null,
          execution: data.execution ? this.serializeExecution(data.execution) : null,
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
