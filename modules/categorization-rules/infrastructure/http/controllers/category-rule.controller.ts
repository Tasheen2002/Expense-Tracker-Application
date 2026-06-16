import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { CategoryRule } from "../../../domain/entities/category-rule.entity";
import { RuleExecution } from "../../../domain/entities/rule-execution.entity";
import {
  CreateCategoryRuleBody,
  UpdateCategoryRuleBody,
} from "../validation/category-rule.schema";
import {
  CreateCategoryRuleCommand,
  CreateCategoryRuleHandler,
  UpdateCategoryRuleCommand,
  UpdateCategoryRuleHandler,
  DeleteCategoryRuleCommand,
  DeleteCategoryRuleHandler,
  ActivateCategoryRuleCommand,
  ActivateCategoryRuleHandler,
  DeactivateCategoryRuleCommand,
  DeactivateCategoryRuleHandler,
  GetRuleByIdQuery,
  GetRuleByIdHandler,
  GetRulesByWorkspaceQuery,
  GetRulesByWorkspaceHandler,
  GetActiveRulesByWorkspaceQuery,
  GetActiveRulesByWorkspaceHandler,
  GetExecutionsByRuleQuery,
  GetExecutionsByRuleHandler,
} from "../../../application";

export class CategoryRuleController {
  constructor(
    private readonly createRuleHandler: CreateCategoryRuleHandler,
    private readonly updateRuleHandler: UpdateCategoryRuleHandler,
    private readonly deleteRuleHandler: DeleteCategoryRuleHandler,
    private readonly activateRuleHandler: ActivateCategoryRuleHandler,
    private readonly deactivateRuleHandler: DeactivateCategoryRuleHandler,
    private readonly getRuleByIdHandler: GetRuleByIdHandler,
    private readonly getRulesByWorkspaceHandler: GetRulesByWorkspaceHandler,
    private readonly getActiveRulesByWorkspaceHandler: GetActiveRulesByWorkspaceHandler,
    private readonly getExecutionsByRuleHandler: GetExecutionsByRuleHandler,
  ) {}

  // ============================================================================
  // Serialization Helpers
  // ============================================================================

  private serializeRule(rule: CategoryRule) {
    return {
      ruleId: rule.getId().getValue(),
      workspaceId: rule.getWorkspaceId().getValue(),
      name: rule.getName(),
      description: rule.getDescription(),
      priority: rule.getPriority(),
      isActive: rule.getIsActive(),
      conditionType: rule.getCondition().getType(),
      conditionValue: rule.getCondition().getValue(),
      targetCategoryId: rule.getTargetCategoryId().getValue(),
      createdBy: rule.getCreatedBy().getValue(),
      createdAt: rule.getCreatedAt().toISOString(),
      updatedAt: rule.getUpdatedAt().toISOString(),
    };
  }

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

  async getRuleById(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const query: GetRuleByIdQuery = { ruleId, userId };
      const rule = await this.getRuleByIdHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Category rule retrieved successfully",
        this.serializeRule(rule),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listRules(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly, limit, offset } = request.query;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      if (activeOnly === "true") {
        const query: GetActiveRulesByWorkspaceQuery = {
          workspaceId,
          userId,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        };
        const result = await this.getActiveRulesByWorkspaceHandler.handle(query);
        return ResponseHelper.success(
          reply,
          200,
          "Active category rules retrieved successfully",
          {
            items: result.items.map(r => this.serializeRule(r)),
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        );
      } else {
        const query: GetRulesByWorkspaceQuery = {
          workspaceId,
          userId,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        };
        const result = await this.getRulesByWorkspaceHandler.handle(query);
        return ResponseHelper.success(
          reply,
          200,
          "Category rules retrieved successfully",
          {
            items: result.items.map(r => this.serializeRule(r)),
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

  async getRuleExecutions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const query: GetExecutionsByRuleQuery = {
        ruleId,
        limit: request.query.limit ? parseInt(request.query.limit) : undefined,
        offset: request.query.offset ? parseInt(request.query.offset) : undefined,
      };
      const result = await this.getExecutionsByRuleHandler.handle(query);

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

  // ============================================================================
  // Commands
  // ============================================================================

  async createRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateCategoryRuleBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: CreateCategoryRuleCommand = {
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        priority: request.body.priority,
        conditionType: request.body.conditionType,
        conditionValue: request.body.conditionValue,
        targetCategoryId: request.body.targetCategoryId,
        createdBy: userId,
      };

      const result = await this.createRuleHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to create category rule",
          details: result.errors,
        });
      }

      const rule = result.data!;
      return ResponseHelper.success(
        reply,
        201,
        "Category rule created successfully",
        this.serializeRule(rule),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
      Body: UpdateCategoryRuleBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;
      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: UpdateCategoryRuleCommand = {
        ruleId,
        userId,
        name: request.body.name,
        description: request.body.description,
        priority: request.body.priority,
        conditionType: request.body.conditionType,
        conditionValue: request.body.conditionValue,
        targetCategoryId: request.body.targetCategoryId,
      };

      const result = await this.updateRuleHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to update category rule",
          details: result.errors,
        });
      }

      const rule = result.data!;
      return ResponseHelper.success(
        reply,
        200,
        "Category rule updated successfully",
        this.serializeRule(rule),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: DeleteCategoryRuleCommand = { ruleId, userId };
      const result = await this.deleteRuleHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to delete category rule",
          details: result.errors,
        });
      }

      return ResponseHelper.success(
        reply,
        200,
        "Category rule deleted successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: ActivateCategoryRuleCommand = { ruleId, userId };
      const result = await this.activateRuleHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to activate category rule",
          details: result.errors,
        });
      }

      const rule = result.data!;
      return ResponseHelper.success(
        reply,
        200,
        "Category rule activated successfully",
        this.serializeRule(rule),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: DeactivateCategoryRuleCommand = { ruleId, userId };
      const result = await this.deactivateRuleHandler.handle(command);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: "Bad Request",
          message: result.error || "Failed to deactivate category rule",
          details: result.errors,
        });
      }

      const rule = result.data!;
      return ResponseHelper.success(
        reply,
        200,
        "Category rule deactivated successfully",
        this.serializeRule(rule),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
